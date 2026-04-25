package com.backend.backend.controllers;

import com.backend.backend.models.Resource;
import com.backend.backend.services.ResourceService;
import com.backend.backend.utils.QRCodeGenerator;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // NEW: For file uploads
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;


import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader; // NEW: For reading the file
import java.io.IOException;
import java.io.InputStreamReader; // NEW: For reading the file
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets; // NEW: To handle text encoding
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/resources")
@CrossOrigin(origins = "http://localhost:5173") 
public class ResourceController {

    @Autowired
    private ResourceService resourceService;

    // 1. POST - Create a new resource in the catalogue
    @PostMapping
    public ResponseEntity<Resource> createResource(@Valid @RequestBody Resource resource) {
        Resource newResource = resourceService.createResource(resource);
        return new ResponseEntity<>(newResource, HttpStatus.CREATED);
    }

    // 2. UPGRADED GET - Retrieve all active resources (Hides archived)
   // UPGRADED GET - Server-Side Search and Filtering
  @GetMapping
    public ResponseEntity<Page<Resource>> getAllResources(
            @RequestParam(required = false, defaultValue = "") String searchTerm,
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "") String location,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity,
            @RequestParam(defaultValue = "0") int page, // NEW: Which page they want (starts at 0)
            @RequestParam(defaultValue = "10") int size // NEW: How many items per page
    ) {
        try {
            // Bundle the page and size into a Pageable object
            Pageable pageable = PageRequest.of(page, size);
            
            // Pass the search terms AND the pageable object to the service
            Page<Resource> resources = resourceService.searchAndFilterResources(
                searchTerm,
                type,
                status,
                location,
                minCapacity,
                maxCapacity,
                pageable
            );
            
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // GET - Retrieve a single specific resource by its ID
    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(@PathVariable String id) {
        Optional<Resource> resource = resourceService.getResourceById(id);
        return resource.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                       .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    // 3. PUT - Update an existing resource
    @PutMapping("/{id}")
    public ResponseEntity<Resource> updateResource(@PathVariable String id, @Valid @RequestBody Resource resourceDetails) {
        Resource updatedResource = resourceService.updateResource(id, resourceDetails);
        if (updatedResource != null) {
            return new ResponseEntity<>(updatedResource, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    // 4. UPGRADED DELETE - Triggers the Soft Deletion
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable String id) {
        boolean isArchived = resourceService.softDeleteResource(id);
        
        if (isArchived) {
            // Returns a nice JSON message to React
            return ResponseEntity.ok().body(Map.of("success", true, "message", "Resource archived safely."));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Resource not found."));
        }
    }

    // 5. NEW: Generate QR Code for a specific resource
    @GetMapping(value = "/{id}/qrcode", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generateResourceQRCode(@PathVariable String id) {
        try {
            Optional<Resource> resourceOpt = resourceService.getResourceById(id);
            
            if (resourceOpt.isPresent()) {
                Resource resource = resourceOpt.get();
                
                String publicUrl = "https://ensure-alkalize-petal.ngrok-free.dev"; 
                
                // 2. We route it to a specific "mobile view" page
                String qrText = publicUrl + "/resource/view/" + resource.getId();

                // Generate a 250x250 pixel QR code
                byte[] image = QRCodeGenerator.getQRCodeImage(qrText, 250, 250);
                
                return ResponseEntity.ok().body(image);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

   // EXPORT ENDPOINT
   @GetMapping("/export")
    public void exportResourcesToCSV(
            @RequestParam(required = false, defaultValue = "") String searchTerm,
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "") String location,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity,
            HttpServletResponse response) throws IOException {

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"filtered_campus_resources.csv\"");

        PrintWriter writer = response.getWriter();
        writer.println("Name,Type,Capacity,Location,AvailabilityWindows,Status");

        // 1 & 2. Call the DB directly. Pageable.unpaged() grabs ALL matches, ignoring the 10-per-page limit.
        Page<Resource> exportPage = resourceService.searchAndFilterResources(
            searchTerm,
            type,
            status,
            location,
            minCapacity,
            maxCapacity,
            Pageable.unpaged()
        );
        
        // Extract the raw List of data from the Page wrapper
        List<Resource> resourcesToExport = exportPage.getContent();

        // 3. Write the results to the CSV
        for (Resource res : resourcesToExport) {
            String name = res.getName() != null ? res.getName().replace(",", " ") : "";
            String sanitizedLocation = res.getLocation() != null ? res.getLocation().replace(",", " ") : "";
            
            writer.println(
                name + "," +
                res.getType() + "," +
                res.getCapacity() + "," +
                sanitizedLocation + "," +
                res.getAvailabilityWindows() + "," +
                res.getStatus()
            );
        }

        writer.flush();
        writer.close();
    }

    // NEW: IMPORT ENDPOINT
    @PostMapping("/import")
    public ResponseEntity<Map<String, String>> importResourcesFromCSV(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        if (file.isEmpty()) {
            response.put("error", "Please upload a valid CSV file.");
            return ResponseEntity.badRequest().body(response);
        }

        try (BufferedReader fileReader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<Resource> resourcesToSave = new ArrayList<>(); 
            String line;
            boolean isFirstRow = true;

            while ((line = fileReader.readLine()) != null) {
                if (isFirstRow) {
                    isFirstRow = false; // Skip the header row
                    continue;
                }

                String[] data = line.split(",");

                // Make sure the row has the expected 6 columns (Name, Type, Capacity, Location, Availability, Status)
                if (data.length >= 6) {
                    Resource resource = new Resource();
                    resource.setName(data[0].trim());
                    resource.setType(data[1].trim());
                    
                    try {
                        resource.setCapacity(Integer.parseInt(data[2].trim()));
                    } catch (NumberFormatException e) {
                        resource.setCapacity(0); 
                    }
                    
                    resource.setLocation(data[3].trim());
                    resource.setAvailabilityWindows(data[4].trim());
                    resource.setStatus(data[5].trim());

                    resourcesToSave.add(resource);
                }
            }

            // Save each valid resource using your existing service method
            for (Resource res : resourcesToSave) {
                resourceService.createResource(res);
            }

            response.put("message", "Successfully imported " + resourcesToSave.size() + " resources!");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("error", "Failed to process the CSV file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}