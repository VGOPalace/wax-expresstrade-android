# WAX ExpressTrade Application

Here you find the Android Source Code of the **VGOPalace Contest Entry** for the **Wax ExpressTrade Contest**! 

 - The application is built using the Phonegap Framework and will work on any Device with Android 5.0+ / iOS Coming Soon. 
 - Our Backend is running NodeJS and acts as the main API Request Handler.

 
## Changelog

### V 1.1.0 - Nov. 21, 2018

#### Additions

 - Added Multiaccount Management
	 - You can now have multiple accounts in one application
	 - You can now see pending offer notifications of all logged in accounts in the menu
 - Added Favorite Users
	 - You can now set Favorites to recognize important People
	 - Favorites list is managable under Settings
 - Added Blacklist
	 - Works as a spam / scam avoid
	 - You can now add Users to your Blacklist
	 - Incoming Offers by these Users will automatically be detected and declined
	 - Blacklist is managable under Settings
- Added Item Details
	- You can now view Item Details such as the ID by clicking the item
- Added Withdraw to OPSkins
	- You can now withdraw items from your WAX ExpressTrade Inventory into your OPSkins
- Added TwoFactor Secret Input
	- You can now input the TwoFactor Secret instead of scanning the QR-Code to enable the In-App TwoFactor
- Added Loading Animations
- Added Total Inventory Value

#### Bugfixes & Changes

- Fixed an issue that resolved to the app not login the user in on first login
- Fixed an issue that would cause the API Logout to now work correctly
- Fixed a bug where the TwoFactor would not work as intended with multiple Users
- Fixed an issue that would cause the menu to open even if not logged in
- Fixed a bug that would cause the app to jump back to pending offers after page change
- Fixed a bug that resulted in a logout after a backend restart
- Changed design of the login button
- Changed spacing of menu entries
- Changed icons in menu
- Minor text fixes

### V 1.0.2 - Nov. 19, 2018

#### Additions

- Added support for Cryptokitties
	- You can now trade Cryptokitties, WAX Stickers and VGO Items in the same trade

### V 1.0.1 - Nov. 05, 2018

#### Additions

- Added support for WAX Stickers
	- You can now trade WAX Stickers along with VGO Items in the same offer

#### Bugfixes & Changes

- Minor text fixes

### V 1.0.0 - Oct. 19, 2018 (Initial Release)

#### Additions

- Added Offers
	- You can now see your offers
	- You can now accept or decline offers
- Added Offer Details
	- You can now see information about the items
	- You can now see the overall price of both trade attendees
- Added Trade
	- You can now send trades to other users
	- You can now see the inventory of other people to select skins
	- You can now see the value of the selected skins
- Added Inventory
	- You can now see your VGO Inventory
	- You can now see short information about your Items
- Added TwoFactor
	- You can now activate our In-App TwoFactor
	- You now have a indicator bar to show you the validity of your token
	- TwoFactor works even offline
	- For ease of use the TwoFactor Token will automatically be filled into the acceptance modal
- Added OPSkins Auth
	- You can now login via OPSkins

**NOTICE:** All data including the TwoFactor Secret will be stored localy on your device for safety purposes! Those will never be exchanged with our backend server!

#### Bugfixes & Changes

- Adjusted Colors to better fit mobile Screens

## Developing

While developing the application we came accross many ideas that we were not able to push into the final release so look forward towards future improvements and updates to provide you with an even better experience!

## About

 - **./app/** - main files (Excluding Phonegap resources)
 - **./app/www/** - all project resources including HTML, CSS and Images
 - **./backend/index.js** - backend code written in NodeJS

## Visit us

| Service | Link |
|----|----|
| Website | [VGOPalace.com](https://vgopalace.com) |
| Twitter | [@VGOPalace](https://twitter.com/VGOPalace) |
| EMail | [VGOPalace@gmail.com](mailto:vgopalace@gmail.com?subject=Application%20-%20Feedback%20and%20Suggestions) |
| | |
| Android | [WAX ExpressTrade](https://play.google.com/store/apps/details?id=com.vgopalace.expresstrade) |
| iOS | **COMING SOON** |
