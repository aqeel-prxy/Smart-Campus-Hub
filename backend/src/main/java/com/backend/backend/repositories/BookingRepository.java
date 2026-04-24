package com.backend.backend.repositories;

import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {

    List<Booking> findByRequesterEmailOrderByBookingDateDescStartTimeDesc(String requesterEmail);

    List<Booking> findByBookingDateBetweenOrderByBookingDateDescStartTimeDesc(LocalDate fromDate, LocalDate toDate);

    List<Booking> findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
        String resourceId,
        LocalDate bookingDate,
        Collection<BookingStatus> statuses,
        LocalTime requestedEndTime,
        LocalTime requestedStartTime
    );
}
