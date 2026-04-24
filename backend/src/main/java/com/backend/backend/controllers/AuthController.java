package com.backend.backend.controllers;

import com.backend.backend.annotation.RateLimitAuth;
import com.backend.backend.dto.AuthRequest;
import com.backend.backend.models.User;
import com.backend.backend.repositories.UserRepository;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 1. STANDARD LOGIN ENDPOINT
    @PostMapping("/login")
    @RateLimitAuth
    public ResponseEntity<?> login(@RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        try {
            // Check credentials against the database
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            // Set the session context manually so Spring remembers them
            SecurityContextHolder.getContext().setAuthentication(authentication);
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());

            return ResponseEntity.ok(Map.of("success", true, "message", "Login successful"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password"));
        }
    }

    // 2. REGISTRATION ENDPOINT (With Magic @admin rule)
    @PostMapping("/register")
    @RateLimitAuth
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email already in use!"));
        }

        Set<String> roles = new HashSet<>();
        roles.add("ROLE_USER"); // Everyone gets USER

        // The Magic Admin Rule: If the email has "@admin" in it, give them superpowers
        if (request.getEmail().contains("@admin")) {
            roles.add("ROLE_ADMIN");
        }

        // Create and save the new user (encrypting the password securely!)
        User user = new User(request.getEmail(), passwordEncoder.encode(request.getPassword()), roles);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "User registered successfully!"));
    }

    // Create default admin endpoint
    @PostMapping("/create-admin")
    public ResponseEntity<?> createDefaultAdmin() {
        try {
            if (!userRepository.existsByEmail("admin@campus.edu")) {
                Set<String> adminRoles = new HashSet<>();
                adminRoles.add("ROLE_USER");
                adminRoles.add("ROLE_ADMIN");
                
                User admin = new User("admin@campus.edu", passwordEncoder.encode("admin123"), adminRoles);
                userRepository.save(admin);
                return ResponseEntity.ok(Map.of("success", true, "message", "Default admin user created successfully!"));
            } else {
                return ResponseEntity.ok(Map.of("success", true, "message", "Admin user already exists!"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to create admin: " + e.getMessage()));
        }
    }

    // Debug endpoint to check users in database
    @GetMapping("/debug/users")
    public ResponseEntity<?> debugUsers() {
        try {
            List<User> users = userRepository.findAll();
            return ResponseEntity.ok(Map.of("success", true, "users", users.stream().map(user -> Map.of(
                "email", user.getEmail(),
                "roles", user.getRoles()
            ))));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to fetch users: " + e.getMessage()));
        }
    }

    // 3. UNIFIED USER CHECK (Handles both Google and Standard Logins)
    @GetMapping("/user")
    public Map<String, Object> getUser(Authentication authentication) {
        // If no one is logged in
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return Map.of("authenticated", false);
        }

        String email = "";
        String name = "";

        // Identify if they logged in with Google
        if (authentication.getPrincipal() instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
            email = oidcUser.getEmail();
            name = oidcUser.getFullName();
        }
        // Identify if they logged in with standard email/password
        else if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.User) {
            org.springframework.security.core.userdetails.User springUser = (org.springframework.security.core.userdetails.User) authentication.getPrincipal();
            email = springUser.getUsername();
            name = email.split("@")[0]; // Use the first part of the email as a display name
        }

        Set<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        String role = authorities.contains("ROLE_ADMIN") ? "admin" : "user";

        return Map.of(
                "authenticated", true,
                "email", email,
                "roles", authorities,
                "role", role
        );
    }
}