const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
1. Go to https://sis.rutgers.edu/soc/#home and search for your class.
2. Put that link in url variable
3. Input the rest of your information.
4. Run with node "app.js"
*/
const sectionNumbers = [90, 18, 19];
const sectionIndexNumbers = ['10377', '09452', '09452'];
const NETID = '';
const PASSWORD = '';
const delayBetweenChecks = 10;

function ClassToRegister(url, sectionNumber, sectionIndexNumber, i) {
  this.url = url;
  this.sectionNumber = sectionNumber;
  this.sectionIndexNumber = sectionIndexNumber;
  this.registered = false;
  this.i = i;
}

function generateURL(sectionIndexNumber){
  return "https://sis.rutgers.edu/soc/#keyword?keyword="+sectionIndexNumber+"&semester=92019&campus=NB&level=U";
}

function start() {
  if (sectionNumbers.length != sectionIndexNumbers.length) {
    console.log("incorrect inputs");
    return;
  }
  for (var i = 0; i < sectionNumbers.length; i++) {
    var classToRegister = new ClassToRegister(generateURL(sectionIndexNumbers[i]), sectionNumbers[i], sectionIndexNumbers[i], i);
    getScheduleInfo(classToRegister);
  }
}


//go to course schedule planner
async function getScheduleInfo(course) {

  puppeteer.launch().then(async browser => {
    var schedulePage = await browser.newPage();
    try {
      await schedulePage.goto(course.url, {
        waitUntil: 'networkidle2'
      });
    } catch (error) {
      console.log(error);
    }
    let bodyHTML = await schedulePage.evaluate(() => document.body.outerHTML);
    await browser.close();
    /*
    await checkAndRegister(bodyHTML, course);
    if (course.registered === false) {
      //setTimeout(getScheduleInfo(course), 100);
      await setTimeout(makeTimeoutFunc(getScheduleInfo(course)), delayBetweenChecks);
    }
    */
    if(checkAndRegister(bodyHTML, course)===false){
      await setTimeout(makeTimeoutFunc(getScheduleInfo(course)), delayBetweenChecks);
    }
  });
}

function makeTimeoutFunc(param) {
  return function() {
    // does something with param
  }
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

function checkAndRegister(html, course) {
  var foundOpenClass = false;
  //iterate through all open classes
  $('.sectionopen', html).each(function() {
    if ($(this).text() == course.sectionNumber) {
      console.log("Requested class is open. Attempting to register.  ".green + course.i);
      foundOpenClass = true;

      //go to webreg and attempt registeration
      try {
        puppeteer.launch({
          headless: true
        }).then(async browser => {
          var registerPage = await browser.newPage();
          try {
            await registerPage.goto('https://sims.rutgers.edu/webreg/', {
              waitUntil: 'networkidle2'
            });
          } catch (error) {
            console.log(error);
          }
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
          console.log(0);
          await registerPage.click('#fm1 > fieldset > div:nth-child(7) > input.btn-submit');

          //choose semester

          await registerPage.waitForSelector('#wr > div');
          console.log(1);

          await registerPage.click("#wr > div");
          console.log(2);
          await registerPage.waitFor(3000);
          await registerPage.focus('#i1');
          await registerPage.keyboard.type(course.sectionIndexNumber);
          await registerPage.waitFor(300);
          await registerPage.click('#submit');
          await registerPage.waitFor(15000);
          await registerPage.close();
          try {
            var text = await registerPage.evaluate(() => document.querySelector('.ok').textContent);
            console.log(text);
            if (text === "1 course(s) added successfully.") {
              console.log("Successfully registered. Shutting down...   ".green + course.i);
              course.registered = true;
              return true;
            }

          } catch (error) {
            try {
              console.log(await registerPage.evaluate(() => document.querySelector('.error').textContent) + " Retrying...".purple);
            } catch (err) {
              console.log("Course registeration error occured. Retrying...  ".red + course.i);
              return false;
            }
            console.log("Course registeration error occured. Retrying...  ".red + course.i);
            return false;
          }
          await browser.close();
        });
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  });
  if (foundOpenClass === false) {
    console.log(NETID+"'s"+" Class "+ course.i+" not open. Retrying...   ".red + " "+ new Date(Date.now()).toLocaleString());
    return false;
  }
}
start();
