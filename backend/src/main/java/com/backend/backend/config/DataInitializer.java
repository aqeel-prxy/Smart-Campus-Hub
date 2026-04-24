package com.backend.backend.config;

import com.backend.backend.models.User;
import com.backend.backend.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner init(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Create default admin user if not exists
            if (!userRepository.existsByEmail("admin@campus.edu")) {
                Set<String> adminRoles = new HashSet<>();
                adminRoles.add("ROLE_USER");
                adminRoles.add("ROLE_ADMIN");
                
                User admin = new User("admin@campus.edu", passwordEncoder.encode("admin123"), adminRoles);
                userRepository.save(admin);
                System.out.println("Default admin user created: admin@campus.edu / admin123");
            }
        };
    }
}
