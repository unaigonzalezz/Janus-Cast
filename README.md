<h1 align="center">
  <br>
  <a><img src="https://i.ibb.co/xKrdxtfw/Janus-Cast.png" alt="Janus Cast Logo" height="100px"></a>
</h1>

<h3 align="center">Send payloads directly from your Stream Deck!</h3>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#settings">Settings</a> •
  <a href="#logging">Logging</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#download">Download</a> •
  <a href="#support">Support</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<h1 align="center">
  <br>
  <img src="https://i.ibb.co/wZGDXLYc/Banner.png" alt="Janus Cast">
</h1>

## Key Features

- **TCP & UDP Support**  
  Send any payload file over TCP or UDP to any IP or hostname.

- **Action-based configuration**  
  Each button can be configured independently with:
  - Name  
  - IP  
  - Port  
  - Protocol (TCP / UDP)  
  - Payload file  
  - Timeout  
  - Background image  
  - Key display options (Name / IP / Port)

- **Real-time persistent logging**  
  - All requests are logged automatically.  
  - Logs show: timestamp, name, IP, port, protocol, bytes sent, and server response.  
  - Integrated log viewer:  
    - Opens in browser  
    - Auto-refreshes  
    - Can be cleared from plugin settings

- **Made for developers, modders, testers and automation workflows.**

## Settings

These reflect exactly the HTML UI:

- **Name** → Text field  
- **IP Address** → Validated IPv4 (rejects localhost & private ranges)  
- **Port** → Numeric  
- **Type** → TCP or UDP radio selector  
- **Payload File** → File picker  
- **Background Image** → PNG/JPEG picker  
- **Timeout (ms)** → Numeric input  
- **Display Options** → Show Name / IP / Port checkboxes  

### Log Controls
- **Open log** → Opens the HTML log viewer  
- **Clear log** → Clears persistent logs

## Logging

Janus Cast includes a full logging system:

- Logs every request sent from any button  
- Includes:
  - Timestamp  
  - Payload name  
  - IP & port  
  - Protocol  
  - Number of bytes sent  
  - Plugin response  
  - Server reply (when using TCP)
- Log file is persistent and can be manually cleared  
- Log UI auto-refreshes and displays entries cleanly

Access from:  
**Property Inspector → Request Log → Open log**

## Requirements

- Windows 10 or later  
- Stream Deck 6.7 or later  
- .NET 6.0 Runtime  

## Download

👉 Get the latest release on the **Stream Deck Marketplace**  
or from the **GitHub Releases Page**:

https://github.com/unaigonzalezz/janus-cast/releases  


## Support

If you’d like to support development:

<a href="https://www.buymeacoffee.com/unaiitxuu" target="_blank">
  <img src="https://www.buymeacoffee.com/assets/img/custom_images/purple_img.png" height="41">
</a>

<a href="https://ko-fi.com/unaigonzalez" target="_blank">
  <img src="https://user-images.githubusercontent.com/7586345/125668092-55af2a45-aa7d-4795-93ed-de0a9a2828c5.png" width="160">
</a>

## Contributing

Pull requests are welcome!  
Open an issue first if you want to propose major changes.

## License

MIT  
