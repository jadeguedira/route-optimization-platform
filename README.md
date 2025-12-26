# Route Optimization Platform

## Description

DelivHub is a web application designed to optimize bicycle delivery routes in urban environments using the Pickup & Delivery model. The application reads city maps and delivery requests from XML files, distributes demands among multiple couriers, and computes optimized tours that respect precedence constraints (pickup must occur before delivery). The solution includes an interactive map visualization, timeline tracking, and tour saving/loading capabilities.

This project was developed as part of the Long-Term Agile Project (PLD Agile) at INSA Lyon.


## How to Launch

### Prerequisites
- Node.js (v18 or higher)
- Modern web browser (Chrome, Firefox, etc.)

### Installation and Execution

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node front/server.js
```

3. Open your browser and navigate to:
```
http://localhost:8080
```



## Features

### Data Loading
- Load city maps from XML files (nodes, segments, warehouse location)
- Load or create delivery requests from XML files (pickup, delivery, durations)
- Automatic validation of file structure and data consistency

### Courier Management
- Create and manage multiple couriers dynamically
- Select specific couriers for tour assignment
- Automatic distribution of demands among couriers using K-means clustering

### Tour Calculation
- Strict respect of precedence constraints (Pickup before Delivery)
- Minimization of total tour time
- Constant speed: 15 km/h
- Departure and return to warehouse at 08:00
- Maximum tour duration: 8 hours

### Visualization
- Interactive map using Leaflet library
- Display of actual routes computed with shortest path algorithms
- Detailed timeline showing:
  - Tour steps and waypoints
  - Arrival and departure times
  - Step types (Warehouse, Pickup, Delivery)

### Save and History
- Save computed tours in JSON format
- Load previously saved tours from server
- Browse tour history



## Architecture

### MVC Structure

The project follows a clear Model-View-Controller architecture to separate concerns and ensure maintainability.

**Model (Backend Logic - JavaScript)**

Located in the `/backend/` directory:

- **Plan, Node, Segment**: Representation of the city graph (intersections and road segments)
- **Demand**: Pickup and Delivery request with associated durations
- **Courier**: Courier entity with identifier and properties
- **Tour, TourPoint, Leg**: Tour structure and components
- **ComputerTour**: Core computation module
  - Shortest path algorithms (Dijkstra, A* with Euclidean heuristic)
  - TSP resolution with precedence constraints (Branch & Bound, Nearest Neighbor, 2-opt)
- **System**: Central coordinator
  - Data loading from XML
  - Demand distribution using K-means clustering
  - Tour computation orchestration
  - Save and restore operations

**View (Frontend)**

Located in the `/front/` directory:

- HTML/CSS interface
- Interactive Leaflet map
- Tour timeline display
- Management sidebar (couriers, demands)

**Controller**

- **app.js**: Handles user interactions and coordinates between view and model
- **view.js**: View management and updates
- **geocoding.js**: Address geocoding utilities

### Key Algorithms

**Shortest Path**
- Dijkstra's algorithm
- A* algorithm with Euclidean heuristic

**Tour Optimization (TSP with constraints)**
- Branch & Bound for small sets
- Nearest Neighbor heuristic
- 2-opt local improvement
- Strict enforcement of Pickup-Delivery precedence

**Multi-Courier Distribution**
- K-means clustering
- Atomic demand handling (pickup and delivery stay together)



## Technologies

- JavaScript (ES6)
- HTML/CSS
- Leaflet (interactive maps)
- Node.js
- XML/JSON
- Git



## Project Structure

```
.
 backend/                     # Business logic and algorithms
    demand.js
    node.js
    segment.js
    plan.js
    courier.js
    tourpoint.js
    leg.js
    tours.js
    computerTour.js
    system.js

 front/                       # User interface
    scripts/
       app.js              # Controller
       view.js             # View management
       geocoding.js
    styles/
        styles.css

 fichiersXMLPickupDelivery/   # Sample XML files (maps and requests)
 TESTS/                       # Unit tests
 saved_tours/                 # Saved tour files
 README.md
```



## Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Test Coverage
- Systematic XML file validation
- Edge case handling:
  - Invalid demands
  - Nodes outside the map
  - Impossible tours
- Detailed logging for performance analysis and debugging



## Future Improvements

- Time window constraints for deliveries
- Courier capacity limits
- Dynamic tour recalculation
- Advanced optimization algorithms (genetic algorithms, simulated annealing)
- Persistent backend with REST API
- Real-time tracking integration

## License

This project is developed in an academic context (INSA Lyon - PLD Agile).
