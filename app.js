const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
1. Go to https://sis.rutgers.edu/soc/#home and search for your class.
2. Put that link in url variable
3. Input the rest of your information.
4. Run with node "app.js"
*/
const url = 'https://sis.rutgers.edu/soc/#keyword?keyword=INTRODUCTION%20TO%20CREATIVE%20WRITING&semester=12019&campus=NB&level=U';
const sectionNumber = 17;
const sectionIndexNumber = '09452';
const NETID = '';
const PASSWORD = '';
const registered = false;

//go to course schedule planner
function getScheduleInfo() {
  puppeteer.launch().then(async browser => {
    var schedulePage = await browser.newPage();
    await schedulePage.goto(url, {
      waitUntil: 'networkidle2'
    });

    let bodyHTML = await schedulePage.evaluate(() => document.body.outerHTML);
    //saveToFile(bodyHTML);
    //above line is for debugging
    await checkAndRegister(bodyHTML);
    await browser.close();
    if (registered === false) {
      setTimeout(getScheduleInfo, 100);
    }
  });
}

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
  var foundOpenClass = false;
  //iterate through all open classes
  $('.sectionopen', html).each(function() {
    if ($(this).text() == sectionNumber) {
      console.log("Requested class is open. Attempting to register.".green);
      foundOpenClass = true;
      //go to webreg and attempt registeration
      puppeteer.launch({
        headless: false
      }).then(async browser => {
        var registerPage = await browser.newPage();
        await registerPage.goto('https://sims.rutgers.edu/webreg/', {
          waitUntil: 'networkidle2'
        });
        //this sequence starts at webreg landing page and ends at registration.
        await registerPage.evaluate(() => {
          document.querySelectorAll('a')[0].click();
        }, {
          waitUntil: 'networkidle2'
        });
        await registerPage.waitForNavigation();
        await registerPage.focus('#username');
        await registerPage.keyboard.type(NETID);
        await registerPage.focus('#password');
        await registerPage.keyboard.type(PASSWORD);
        await registerPage.click('#fm1 > fieldset > div:nth-child(7) > input.btn-submit');
        await registerPage.waitForNavigation();
        await registerPage.waitFor(300);
        await registerPage.click('#submit');
        await registerPage.waitForNavigation();
        await registerPage.focus('#i1');
        await registerPage.keyboard.type(sectionIndexNumber);
        await registerPage.waitFor(300);
        await registerPage.click('#submit');
        await registerPage.waitFor(15000);

        try {
          var text = await registerPage.evaluate(() => document.querySelector('.ok').textContent);
          console.log(text);
          if (text === "1 course(s) added successfully.") {
            console.log("Successfully registered. Shutting down...".green);
            registered = true;
          }

        } catch (error) {
          try {
            console.log(await registerPage.evaluate(() => document.querySelector('.error').textContent) + " Retrying...".purple);
          } catch (err) {
            console.log("Course registeration error occured. Retrying...".red);
          }
          console.log("Course registeration error occured. Retrying...".red);
        }
        await browser.close();
      });
    }
  });
  if (foundOpenClass == false) {
    console.log("Class not open. Retrying...".red);
  }
}

getScheduleInfo();
