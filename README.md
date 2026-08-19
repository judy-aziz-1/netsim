# netsim
Web-based network simulator for teaching hacking to high schoolers

# try it out
You don't need to download and run the code yourself; you can use our hosted version at [netsim.erinn.io](https://netsim.erinn.io/).

# installation
- place files on a webserver
- copy sample.config.inc.php to config.inc.php (editing if necessary)
- browse to index.php to initialize the database

# support
Erinn is on [Patreon](https://www.patreon.com/errorinn)

# acknowledgements
- created by erinn atwater and cecylia bocovich
- device images designed by [madebyoliver](http://www.flaticon.com/authors/madebyoliver) from Flaticon

# SIEM/SOC simulator (backend/ + frontend/)
Run both services with `docker-compose up` from the repo root. Before that, place a real `backend/.env` file (with your MongoDB Atlas credentials) yourself — it is not baked into the image for security reasons, only `backend/.env.example` is. Once running, the app is available at http://localhost:5173, talking to the API at http://localhost:8000.

