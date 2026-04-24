package com.backend.backend.aspect;

import com.backend.backend.annotation.RateLimitAuth;
import com.backend.backend.annotation.RateLimitGeneral;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;

@Aspect
@Component
public class RateLimitAspect {

    private final RateLimiter authRateLimiter;
    private final RateLimiter generalRateLimiter;

    public RateLimitAspect(RateLimiter authRateLimiter, RateLimiter generalRateLimiter) {
        this.authRateLimiter = authRateLimiter;
        this.generalRateLimiter = generalRateLimiter;
    }

    @Around("@annotation(rateLimitAuth)")
    public Object rateLimitAuth(ProceedingJoinPoint joinPoint, RateLimitAuth rateLimitAuth) throws Throwable {
        try {
            RateLimiter rateLimiter = authRateLimiter;
            return RateLimiter.decorateSupplier(rateLimiter, () -> {
                try {
                    return joinPoint.proceed();
                } catch (Throwable throwable) {
                    throw new RuntimeException(throwable);
                }
            }).get();
        } catch (RequestNotPermitted requestNotPermitted) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many requests. Please try again later.");
        } catch (RuntimeException e) {
            throw e.getCause();
        }
    }

    @Around("@annotation(rateLimitGeneral)")
    public Object rateLimitGeneral(ProceedingJoinPoint joinPoint, RateLimitGeneral rateLimitGeneral) throws Throwable {
        try {
            RateLimiter rateLimiter = generalRateLimiter;
            return RateLimiter.decorateSupplier(rateLimiter, () -> {
                try {
                    return joinPoint.proceed();
                } catch (Throwable throwable) {
                    throw new RuntimeException(throwable);
                }
            }).get();
        } catch (RequestNotPermitted requestNotPermitted) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many requests. Please try again later.");
        } catch (RuntimeException e) {
            throw e.getCause();
        }
    }
}
