# Rutgers-Auto-Course-Register

Never miss a class again. Classes at Rutgers University open and close very quickly, sometimes within seconds. This program automatically registers users for classes as soon as they open.

## How it works
RACR uses a headless chrome browser to scrape class information off of the [Rutgers Schedule of Classes](https://sis.rutgers.edu/soc/), then register for the classes through the Rutgers Web Registration System. 

## Usage
Input your information at the top of the script. The script can now track multiple classes and sections inputted as an array.
Run with  
```
node app.js
```

### Dependancies

puppeteer, cheerio, colors
```
npm install puppeteer cheerio colors
```

