const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
1. Go to https://sis.rutgers.edu/soc/#home and search for your class.
2. Put that link in url variable
3. Input the rest of your information.
4. Run with command 'forever app.js'
5. to stop, run 'forever stopall'
*/
const url = 'https://sis.rutgers.edu/soc/#keyword?keyword=INTRODUCTION%20TO%20CREATIVE%20WRITING&semester=12019&campus=NB&level=U';
const sectionNumber = 06;
const sectionIndexNumber = '05561';
const NETID = '';
const PASSWORD = '';

//go to course schedule planner
puppeteer.launch().then(async browser => {
  var schedulePage = await browser.newPage();
  await schedulePage.goto(url, {
    waitUntil: 'networkidle2'
  });

  let bodyHTML = await schedulePage.evaluate(() => document.body.outerHTML);
  //saveToFile(bodyHTML);
  //above line is for debugging
  checkAndRegister(bodyHTML);
  await browser.close();
});

function saveToFile(item) {
  const fs = require('fs');
  fs.writeFile("debug.html", item, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
}

function checkAndRegister(html) {
  //console.log("Parsing html..");
  var foundOpenClass = false;
  //check if each open class the class we want
  $('.sectionopen', html).each(function() {
    if ($(this).text() == sectionNumber) {
      console.log("Requested class is open. Attempting to register.".underline.green);
      foundOpenClass=true;
      //go to webreg and attempt registeration
      puppeteer.launch({headless: false}).then(async browser => {
        var registerPage = await browser.newPage();
        await registerPage.goto('https://sims.rutgers.edu/webreg/', {
          waitUntil: 'networkidle2'
        });
        //this sequence starts at webreg landing page and ends at registration. The thing is, the script doesnt know if you got the class or not, so it will continue attempting to register anyways. Better safe than sorry.
        await registerPage.evaluate(() => { document.querySelectorAll('a')[0].click(); },{waitUntil: 'networkidle2'});
        await registerPage.waitForNavigation();
        await registerPage.focus('#username');
        await registerPage.keyboard.type(NETID);
        await registerPage.focus('#password');
        await registerPage.keyboard.type(PASSWORD);
        await registerPage.click('#fm1 > fieldset > div:nth-child(7) > input.btn-submit');
        await registerPage.waitForNavigation();
        await registerPage.click('#submit');
        await registerPage.waitForNavigation();
        await registerPage.focus('#i1');
        await registerPage.keyboard.type(sectionIndexNumber);
        await registerPage.click('#submit');
        await registerPage.waitFor(15000);
        //// TODO: check if course was successfully added, stop script if it was
        await browser.close();
      });
    }
  });
  if(foundOpenClass==false){
    console.log("Class not open. Retrying...".underline.red);
  }
}
