const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const colors = require('colors');

/*
--- LAST UPDATED FOR SPRING 2021 ---
    it aint pretty but it works

USAGE
1. Install dependencies: puppeteer, cheerio, colors
2. Input your information below
3. Run with "node app.js"
*/
const sectionNumbers = ['90'];
const sectionIndexNumbers = ['04294'];
const NETID = 'nas256';
const PASSWORD = 'EUiscool123!';
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
  return "https://sis.rutgers.edu/soc/#keyword?keyword=" + sectionIndexNumber + "&semester=92021&campus=NB&level=U";
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
      await Promise.resolve().then(() => {
        try {
          if (course.html == null) {
            return schedulePage.goto(course.url, {
              waitUntil: 'networkidle2'
            }).catch((e) => null)
          }
          else {
            return schedulePage.reload({
              waitUntil: 'networkidle2'
            }).catch((e) => null)
          }
        }
        catch (e) {
          console.log(e)
          return null
        }
      })
        .then(test)
      async function test() {
        course.html = await schedulePage.evaluate(() => {
          if (document.body) return document.body.outerHTML
          else return undefined
        })
        if (course.html) status = await checkAndRegister(course);
        await sleep(delayBetweenChecks);
      }
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
  let $ = cheerio.load(course.html)
  let courseOpen = false
  //iterate through all open classes
  $('.sectionopen').each(function () {
    console.log("FRICKING GOT EM", $(this).text());
    if ($(this).text() == course.sectionNumber) {
      console.log(course.sectionIndexNumber + " is open. Attempting to register.  ".green);
      courseOpen = true
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
        document.querySelectorAll('a')[2].click();
      }, {
        waitUntil: 'networkidle2'
      });

      console.log("starting course registration sequence...")

      await registerPage.waitForNavigation();
      await registerPage.focus('#username');
      await registerPage.keyboard.type(NETID);
      await registerPage.focus('#password');
      await registerPage.keyboard.type(PASSWORD);
      await registerPage.click('#fm1 > section > input.btn.btn-block.btn-submit');
      
      console.log("Attempting to log in...")
      await registerPage.waitForTimeout(300);
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

      console.log("typed section index number...")

      await registerPage.waitForTimeout(300);
      await registerPage.waitForSelector('#submit');
      await registerPage.click('#submit');

      console.log("submitted...")

      await registerPage.waitForTimeout(60000);
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
          return { text: "idk something went wrong bruh", registered: true }
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
