

## Global Variables to Manage

* recentRecipes 
    - prevents similiar recipes from being repeated too soon
    - use_num, receipe_id, title, classification, tags, and date
    - pruned at n items
* mixdownQueue
    - mix_id, receipe_id, title, classification, tags, filename, duration, and create_date

## Functions to Write

* Choose a Random Recipe
    - making sure we don't repeat one too soon
    - may want to vary classification (or maybe group them?)
* Choose a Random Clip
    - loosely based on classification, tags, and length
    - return clip record
* Populate a Track
    - takes a track record
    - return track listing, duration



## Server Directory Structure

```
.
├── config            - Application settings and database configuration.
│   ├── config.js     - Central configuration for the server.
│   └── database.js   - Database connection and pooling setup.
├── core              - Central application logic and utilities.
│   ├── api           - Defines routes, middleware, and utilities for the API.
│   │   ├── middleware- Request processing and response handling functions.
│   │   ├── routes    - Endpoints for handling API requests.
│   │   └── utils     - Helper functions specific to API operations.
│   ├── data          - Manages data access and manipulation.
│   ├── middleware    - Application-wide middleware, like auth and error handling.
│   │   ├── authMiddleware.js - Authenticates users and requests.
│   │   └── errorHandler.js   - Handles errors and exceptions.
│   ├── services      - Business logic and service layer.
│   └── utils         - General utility functions for the application.
├── public            - Static files accessible to the public.
├── scripts           - Utility scripts for development and deployment.
├── notes.md          - Project notes and documentation.
├── package.json      - Project dependencies and metadata.
└── server.js         - Entry point to initialize and start the server.
```

Use of logger:

```
// Logging a warning
logger.warn("This is a warning message about XYZ");

// Logging an error
logger.error("Error processing request: ", error);

// Logging debug information
logger.debug("Debugging info: ", someDebugData);
```