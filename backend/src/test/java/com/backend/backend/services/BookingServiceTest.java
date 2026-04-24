package com.backend.backend.services;

import com.backend.backend.dto.BookingCreateRequest;
import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.models.Resource;
import com.backend.backend.repositories.BookingRepository;
import com.backend.backend.repositories.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    private BookingCreateRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new BookingCreateRequest();
        validRequest.setResourceId("res-1");
        validRequest.setBookingDate(LocalDate.now().plusDays(1));
        validRequest.setStartTime(LocalTime.of(9, 0));
        validRequest.setEndTime(LocalTime.of(10, 0));
        validRequest.setPurpose("Lecture");
        validRequest.setExpectedAttendees(45);
    }

    @Test
    void createBookingThrowsConflictWhenOverlappingExists() {
        Resource resource = new Resource();
        resource.setId("res-1");
        resource.setName("Hall A");
        resource.setStatus("ACTIVE");

        when(resourceRepository.findById("res-1")).thenReturn(Optional.of(resource));
        when(
            bookingRepository.findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                eq("res-1"),
                eq(validRequest.getBookingDate()),
                eq(Set.of(BookingStatus.PENDING, BookingStatus.APPROVED)),
                eq(validRequest.getEndTime()),
                eq(validRequest.getStartTime())
            )
        ).thenReturn(List.of(new Booking()));

        var auth = new UsernamePasswordAuthenticationToken("student@sliit.lk", "x");
        assertThrows(ResponseStatusException.class, () -> bookingService.createBooking(validRequest, auth));
    }

    @Test
    void createBookingSavesWhenNoOverlap() {
        Resource resource = new Resource();
        resource.setId("res-1");
        resource.setName("Hall A");
        resource.setStatus("ACTIVE");

        when(resourceRepository.findById("res-1")).thenReturn(Optional.of(resource));
        when(
            bookingRepository.findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                eq("res-1"),
                eq(validRequest.getBookingDate()),
                eq(Set.of(BookingStatus.PENDING, BookingStatus.APPROVED)),
                eq(validRequest.getEndTime()),
                eq(validRequest.getStartTime())
            )
        ).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var auth = new UsernamePasswordAuthenticationToken("student@sliit.lk", "x");
        bookingService.createBooking(validRequest, auth);

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());
        assertEquals("student@sliit.lk", captor.getValue().getRequesterEmail());
        assertEquals(BookingStatus.PENDING, captor.getValue().getStatus());
    }

    @Test
    void cancelBookingDeniesOtherNonAdminUsers() {
        Booking booking = new Booking();
        booking.setId("b-1");
        booking.setRequesterEmail("owner@sliit.lk");
        booking.setStatus(BookingStatus.PENDING);

        when(bookingRepository.findById("b-1")).thenReturn(Optional.of(booking));

        var auth = new UsernamePasswordAuthenticationToken(
            "other@sliit.lk",
            "x",
            List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );

        assertThrows(ResponseStatusException.class, () -> bookingService.cancelBooking("b-1", auth));
        verify(bookingRepository, never()).save(any(Booking.class));
    }
}
