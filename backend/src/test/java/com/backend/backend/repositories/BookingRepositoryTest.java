package com.backend.backend.repositories;

import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.models.Resource;
import com.backend.backend.models.ResourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataMongoTest
@ActiveProfiles("test")
public class BookingRepositoryTest {

    @Autowired
    private BookingRepository bookingRepository;

    private Booking testBooking1;
    private Booking testBooking2;
    private Booking testBooking3;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        
        // Create test bookings
        testBooking1 = new Booking();
        testBooking1.setResourceId("resource1");
        testBooking1.setRequesterEmail("user1@test.com");
        testBooking1.setBookingDate(LocalDate.of(2024, 1, 15));
        testBooking1.setStartTime(LocalTime.of(9, 0));
        testBooking1.setEndTime(LocalTime.of(10, 0));
        testBooking1.setPurpose("Meeting");
        testBooking1.setExpectedAttendees(5);
        testBooking1.setStatus(BookingStatus.PENDING);

        testBooking2 = new Booking();
        testBooking2.setResourceId("resource2");
        testBooking2.setRequesterEmail("user2@test.com");
        testBooking2.setBookingDate(LocalDate.of(2024, 1, 16));
        testBooking2.setStartTime(LocalTime.of(14, 0));
        testBooking2.setEndTime(LocalTime.of(15, 0));
        testBooking2.setPurpose("Workshop");
        testBooking2.setExpectedAttendees(10);
        testBooking2.setStatus(BookingStatus.APPROVED);

        testBooking3 = new Booking();
        testBooking3.setResourceId("resource1");
        testBooking3.setRequesterEmail("user1@test.com");
        testBooking3.setBookingDate(LocalDate.of(2024, 1, 17));
        testBooking3.setStartTime(LocalTime.of(11, 0));
        testBooking3.setEndTime(LocalTime.of(12, 0));
        testBooking3.setPurpose("Presentation");
        testBooking3.setExpectedAttendees(8);
        testBooking3.setStatus(BookingStatus.CANCELLED);
    }

    @Test
    void testSaveAndFindById() {
        Booking saved = bookingRepository.save(testBooking1);
        
        assertNotNull(saved.getId());
        assertEquals(testBooking1.getResourceId(), saved.getResourceId());
        assertEquals(testBooking1.getRequesterEmail(), saved.getRequesterEmail());
        
        Optional<Booking> found = bookingRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
    }

    @Test
    void testFindByRequesterEmailOrderByBookingDateDescStartTimeDesc() {
        bookingRepository.save(testBooking1);
        bookingRepository.save(testBooking3);
        
        List<Booking> userBookings = bookingRepository.findByRequesterEmailOrderByBookingDateDescStartTimeDesc("user1@test.com");
        
        assertEquals(2, userBookings.size());
        // Should be ordered by booking date desc, then start time desc
        assertEquals(LocalDate.of(2024, 1, 17), userBookings.get(0).getBookingDate());
        assertEquals(LocalDate.of(2024, 1, 15), userBookings.get(1).getBookingDate());
    }

    @Test
    void testFindByBookingDateBetweenOrderByBookingDateDescStartTimeDesc() {
        bookingRepository.save(testBooking1);
        bookingRepository.save(testBooking2);
        bookingRepository.save(testBooking3);
        
        LocalDate fromDate = LocalDate.of(2024, 1, 15);
        LocalDate toDate = LocalDate.of(2024, 1, 16);
        
        List<Booking> bookings = bookingRepository.findByBookingDateBetweenOrderByBookingDateDescStartTimeDesc(fromDate, toDate);
        
        assertEquals(2, bookings.size());
        // Should be ordered by booking date desc
        assertEquals(LocalDate.of(2024, 1, 16), bookings.get(0).getBookingDate());
        assertEquals(LocalDate.of(2024, 1, 15), bookings.get(1).getBookingDate());
    }

    @Test
    void testFindByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan() {
        bookingRepository.save(testBooking1);
        
        // Create overlapping booking
        Booking overlappingBooking = new Booking();
        overlappingBooking.setResourceId("resource1");
        overlappingBooking.setRequesterEmail("user3@test.com");
        overlappingBooking.setBookingDate(LocalDate.of(2024, 1, 15));
        overlappingBooking.setStartTime(LocalTime.of(9, 30));
        overlappingBooking.setEndTime(LocalTime.of(10, 30));
        overlappingBooking.setPurpose("Overlapping");
        overlappingBooking.setExpectedAttendees(3);
        overlappingBooking.setStatus(BookingStatus.APPROVED);
        bookingRepository.save(overlappingBooking);
        
        // Search for overlapping bookings
        List<Booking> overlapping = bookingRepository.findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            "resource1",
            LocalDate.of(2024, 1, 15),
            Arrays.asList(BookingStatus.APPROVED, BookingStatus.PENDING),
            LocalTime.of(9, 30), // requestedEndTime
            LocalTime.of(10, 30) // requestedStartTime
        );
        
        assertEquals(1, overlapping.size());
        assertEquals(testBooking1.getId(), overlapping.get(0).getId());
    }

    @Test
    void testDeleteById() {
        Booking saved = bookingRepository.save(testBooking1);
        String bookingId = saved.getId();
        
        bookingRepository.deleteById(bookingId);
        
        Optional<Booking> found = bookingRepository.findById(bookingId);
        assertFalse(found.isPresent());
    }

    @Test
    void testCount() {
        long initialCount = bookingRepository.count();
        assertEquals(0, initialCount);
        
        bookingRepository.save(testBooking1);
        bookingRepository.save(testBooking2);
        
        long finalCount = bookingRepository.count();
        assertEquals(2, finalCount);
    }

    @Test
    void testExistsById() {
        Booking saved = bookingRepository.save(testBooking1);
        
        assertTrue(bookingRepository.existsById(saved.getId()));
        assertFalse(bookingRepository.existsById("nonexistent-id"));
    }
}
