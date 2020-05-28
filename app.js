

const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
    CREATED BY YA BOI NOORSY
--- LAST UPDATED FOR FALL 2020 ---
    it aint pretty but it works
USAGE
1. Go to https://sis.rutgers.edu/soc/#home and search for your class.
2. Put that link in url variable
3. Input the rest of your information.
4. Run with node "app.js"
*/
const sectionNumbers = [92];
const sectionIndexNumbers = ['08310'];
const NETID = 'nas256';
const PASSWORD = 'Meowmix1234';
const delayBetweenChecks = 2000; //milliseconds


function ClassToRegister(url, sectionNumber, sectionIndexNumber, i) {
  this.url = url;
  this.sectionNumber = sectionNumber;
  this.sectionIndexNumber = sectionIndexNumber;
  this.i = i;
  this.html = null;
}

function generateURL(sectionIndexNumber) {
  return "https://sis.rutgers.edu/soc/#keyword?keyword=" + sectionIndexNumber + "&semester=92020&campus=NB&level=U";
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


  puppeteer.launch({
    headless: false
  }).then(async browser => {
    var schedulePage = await browser.newPage();

    do {
      
      try {
        if (course.html == null) {
          await schedulePage.goto(course.url, {
            waitUntil: 'networkidle2'
          });
        } else {
          await schedulePage.reload({
            waitUntil: 'networkidle2'
          });

        }
      } catch (e) {
        console.log(e);
        continue;
      }
      course.html = await schedulePage.evaluate(() => document.body.outerHTML);
      var status = await checkAndRegister(course);
      await sleep(delayBetweenChecks);
    } while (status == false);

    await browser.close();
  });

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeTimeoutFunc(param) {
  return function () {
    // does something with param
  }
}

function saveToFile(item) {
  const fs = require('fs');
  fs.writeFile("debug.html", item, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
}

async function checkAndRegister(course) {
  return  new Promise(function(resolve) {

  var gotClass = false;
  if (course.html === null) {
    return gotClass;
  }

  //iterate through all open classes
  $('.sectionopen', course.html).each(function () {
    console.log($(this).text());
    if ($(this).text() == course.sectionNumber) {
      console.log(course.sectionIndexNumber + " is open. Attempting to register.  ".green);
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
          //console.log(0);
          await registerPage.click('#fm1 > fieldset > div:nth-child(6) > input.btn-submit');

          //choose semester
          try {
            await registerPage.waitForSelector('#wr > div');
            await registerPage.click("#wr > div");
          } catch (e) {
            console.log("Failed to log in. netid/ password is incorrect.".red);
            await registerPage.close();
            await browser.close();
            resolve(false)
          }

          await registerPage.waitForSelector('#i1');
          await registerPage.focus('#i1');
          await registerPage.keyboard.type(course.sectionIndexNumber);
          await registerPage.waitFor(300);
          await registerPage.click('#submit');
          await registerPage.waitFor(15000);

          var text = null;
          try {
            text = await registerPage.evaluate(() => document.querySelector('.ok').textContent);
            console.log(text.green);
            gotClass = true;
          }
          catch (e) {
            console.log(await registerPage.evaluate(() => document.querySelector('.error').textContent));
          }

          await registerPage.close();
          await browser.close();
          if (!gotClass) {
            console.log((NETID + " " + course.sectionIndexNumber + " not open. Retrying...   " + " ").red + new Date(Date.now()).toLocaleString());
          }
          resolve(gotClass)
        });
    }

  });
  console.log((NETID + " " + course.sectionIndexNumber + " not open. Retrying...   " + " ").red + new Date(Date.now()).toLocaleString());
  resolve(false)
})
}

start();
