#V1



REVISE
- add email verification and password creation
- add user login function


- create user dashboard page
    - show map routes recorded
    - record new map route
    - delete map routes
    - edit map route names


- map route record view
    - start recording (at 1st just display map) -- automatically names the map route "Walk at 2026-1-1-03:05"
    - stop recording -- prompts you to name the map route
    - exit -- prompts you to name the map route


- display map
- get GPS coord -- display as coords
- plot GPS location on map and zoom to location


- refresh GPS location every 5 sec
- button to manually refresh GPS location
- plot a new point for the GPS location -- new point should have big pin, other points should be dot

- a line should be drawn between each point in the sequence


Map Routes Table

Stores the metadata for the trip.

id: Primary Key (UUID or Serial)
user_id: Foreign Key (indexed)
name: String (e.g., "Morning Commute")
created_at: Timestamp


Points Table

Stores the actual GPS data. 

id: Primary Key
map_route_id: Foreign Key (references map_routes.id, indexed)
latitude: Decimal (precision 9, scale 6)
longitude: Decimal (precision 9, scale 6)
recorded_at: Timestamp (used to retain order)
Optional: altitude, speed, accuracy 



- save point data to a map route in db for the user
- new map route button -- wipe current points and start saving a new map route







Screen Stay-Awake (No-Sleep):
You can use a "No-Sleep" library (like NoSleep.js) to play a tiny hidden video. This prevents the phone from locking automatically, keeping the browser in the foreground. However, this is battery-intensive and fails if the user manually locks the screen.




#V2

- auto name the map route "Walk near <location description> March 1 2026" -- "Walk #2 near <location description> March 1 2026" if not unique
- setting to change between timestamp, location description auto format

- make the initial database / table creation better --- should just be run during setup of the app.  ideally 1 command or script will run all the necessary setup including database spin up

