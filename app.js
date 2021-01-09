

const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
--- LAST UPDATED FOR SPRING 2021 ---
    it aint pretty but it works

USAGE
1. Install dependencies: puppeteer, cheerio, colors
2. Input your information below
3. Run with "node app.js"
*/
const sectionNumbers = [''];
const sectionIndexNumbers = [''];
const NETID = '';
const PASSWORD = '';
const delayBetweenChecks = 2000; //milliseconds
const headless = false

function Course(url, sectionNumber, sectionIndexNumber, i) {
  this.url = url;
  this.sectionNumber = sectionNumber;
  this.sectionIndexNumber = sectionIndexNumber;
  this.html = null;
  this.count = 0;
}

function generateURL(sectionIndexNumber) {
  return "https://sis.rutgers.edu/soc/#keyword?keyword=" + sectionIndexNumber + "&semester=12021&campus=NB&level=U";
}

function start() {
  if (sectionNumbers.length != sectionIndexNumbers.length) {
    console.log("incorrect inputs");
    return;
  }
  for (let i = 0; i < sectionNumbers.length; i++) {
    snipe(new Course(generateURL(sectionIndexNumbers[i]), sectionNumbers[i], sectionIndexNumbers[i]))
  }
}
//go to course schedule planner
async function snipe(course) {
  puppeteer.launch({
    headless: headless
  }).then(async browser => {
    let schedulePage = await browser.newPage(), status = false
    do {
      try {
        if (course.html == null) {
          await schedulePage.goto(course.url, {
            waitUntil: 'networkidle2'
          }).catch((e) => e)
        }
        else {
          await schedulePage.reload({
            waitUntil: 'networkidle2'
          }).catch((e) => e)
        }
      }
      catch (e) {
        console.log(e)
        continue
      }
      await schedulePage.waitForNavigation()
      course.html = await schedulePage.evaluate(() => {
        if(document.body) return document.body.outerHTML
        else return undefined
      });
      if(course.html) status = await checkAndRegister(course);
      await sleep(delayBetweenChecks);
    } while (status == false);
    console.log("stopping registration for course " + course.sectionIndexNumber)
    await browser.close();
  });

}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkAndRegister(course) {

  if (course.html === null) {
    return false
  }
  let courseOpen = false
  //iterate through all open classes
  $('.sectionopen', course.html).each(function () {
    console.log("YEEEE", $(this).text());
    if ($(this).text() == course.sectionNumber) {
      console.log(course.sectionIndexNumber + " is open. Attempting to register.  ".green);
      //courseOpen = true
    }
  });
  if (courseOpen)
    //go to webreg and attempt registeration
    return puppeteer.launch({
      headless: headless
    }).then(async browser => {
      let registerPage = await browser.newPage();

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
      await registerPage.click('#fm1 > fieldset > div:nth-child(6) > input.btn-submit');

      //choose semester
      try {
        course.count++;
        await registerPage.waitForSelector('#wr > div');
        await registerPage.click("#wr > div");
      } catch (e) {
        console.log("Failed to log in. netid/ password is incorrect.".red);
        await registerPage.close();
        await browser.close();
        return false
      }

      await registerPage.waitForSelector('#i1');
      await registerPage.focus('#i1');
      await registerPage.keyboard.type(course.sectionIndexNumber);
      await registerPage.waitForTimeout(300);
      await registerPage.waitForSelector('#submit');
      await registerPage.click('#submit');
      await registerPage.waitForTimeout(15000);
      if (course.count > 10) {
        return false
      }
      else {
        let res = await registerPage.evaluate(() => {
          let ok = document.querySelector('.ok')
          let error = document.querySelector('.error')
          if (ok != null) return { text: ok.textContent, registered: true }
          if (error != null) {
            let errorText = error.textContent
            if (errorText.includes("already registered")) return { text: errorText, registered: true }
            return { text: errorText, registered: false }
          }
          return { text: "unknown error bruh", registered: true }
        })
        await registerPage.close();
        await browser.close();
        if (res.registered) {
          console.log(res.text.green)
          return true
        }
        else {
          console.log(res.text.red)
          return false
        }
      }
    });
  console.log((NETID + " " + course.sectionIndexNumber + " not open. " + " ").red + new Date(Date.now()).toLocaleString());
  return false
}


start();
