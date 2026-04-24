package com.backend.backend.config;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiterRegistry rateLimiterRegistry() {
        RateLimiterConfig authConfig = RateLimiterConfig.custom()
                .limitForPeriod(5) // 5 requests per period
                .limitRefreshPeriod(Duration.ofMinutes(1)) // Reset every minute
                .timeoutDuration(Duration.ofSeconds(5)) // Wait max 5 seconds
                .build();

        RateLimiterConfig generalConfig = RateLimiterConfig.custom()
                .limitForPeriod(100) // 100 requests per period
                .limitRefreshPeriod(Duration.ofMinutes(1)) // Reset every minute
                .timeoutDuration(Duration.ofSeconds(1)) // Wait max 1 second
                .build();

        RateLimiterRegistry registry = RateLimiterRegistry.of(authConfig);
        registry.rateLimiter("auth", authConfig);
        registry.rateLimiter("general", generalConfig);
        return registry;
    }

    @Bean
    public RateLimiter authRateLimiter(RateLimiterRegistry registry) {
        return registry.rateLimiter("auth");
    }

    @Bean
    public RateLimiter generalRateLimiter(RateLimiterRegistry registry) {
        return registry.rateLimiter("general");
    }
}
