const express = require("express")
const app = express()
var cors = require('cors')
const puppeteer = require('puppeteer')
const dotenv = require('dotenv')
dotenv.config()
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(cors())
var fs = require('fs');

app.listen(process.env.PORT, () =>
    console.log(`Example app listening on port ${process.env.PORT}!`),
)

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/projects', (req, res) => {
    res.render('projects')
})

app.get('/all', async (req, res) => {
    const currentData = await getFlowersData()
    const modifiedData = Object.values(currentData)

    return res.json(modifiedData)
})

app.get('/flower/:index', async (req, res) => {
    const currentData = await getFlowersData()
    const modifiedData = currentData[req.params.index]

    return res.json(modifiedData)
})

app.get('/flowers/:indexes', async (req, res) => {
    const currentData = await getFlowersData()
    const indexesAsString = req.params.indexes
    const indexesAsArray = indexesAsString.split(",")
    const modifiedData = indexesAsArray.map(index => currentData[index])

    return res.json(modifiedData)
})

async function getFlowersData() {
    const scrapedDataPromise = getScrapedData()
    const storedDataPromise = getCachedData()
    const data = await Promise.race([scrapedDataPromise, storedDataPromise])

    return data
}

async function getScrapedData() {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage()
    const data = {}

    await page.goto('https://www.proflowers.com/blog/types-of-flowers/')
    const allElements = await page.$$('#types_of_flowers .row.flower')

    for (let index = 0; index < allElements.length; index++) {
        const flower_name = await allElements[index].$eval('.flower_name', element => element.textContent.trim())
        const flower_description = await allElements[index].$eval('figcaption p', element => element.textContent.trim())
        const flower_picture = await allElements[index].$eval('.img-circle', element => element.src)
        data[index] = {
            index,
            flower_name,
            flower_description,
            flower_picture
        }
    }

    browser.close()
    updateCachedData(data)

    return data
}

async function getCachedData() {
    let storedData, parsedData
    try {
        storedData = fs.readFileSync('data.json')
        parsedData = JSON.parse(storedData)
    }
    catch (err) {
        console.log("CACHE NOT FOUND")
    }

    let currentPromise
    if (parsedData == undefined) {
        currentPromise = new Promise((resolve, reject) => reject)
    } else {
        currentPromise = new Promise((resolve, reject) => resolve(parsedData))
    }
    const data = await currentPromise

    return data
}

function updateCachedData(data) {
    fs.writeFile('data.json', JSON.stringify(data), function (err) {
        if (err) throw err
    })
}