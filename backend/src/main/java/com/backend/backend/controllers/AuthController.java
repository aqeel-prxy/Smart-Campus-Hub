package com.backend.backend.controllers;

import com.backend.backend.annotation.RateLimitAuth;
import com.backend.backend.models.User;
import com.backend.backend.repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
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
        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            email = oidcUser.getEmail();
            name = oidcUser.getFullName();
        }
        // Identify if they logged in with standard email/password
        else if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.User springUser) {
            email = springUser.getUsername();
            name = email.split("@")[0]; // Use the first part of the email as a display name
        }

        return Map.of(
                "authenticated", true,
                "name", name,
                "email", email,
                "roles", authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList())
        );
    }

    // Simple DTO to catch incoming JSON requests from React
    public static class AuthRequest {
        private String email;
        private String password;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}