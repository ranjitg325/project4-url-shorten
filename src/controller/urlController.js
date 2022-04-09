
//const validUrl = require('valid-url')
const shortid = require('shortid')
const urlModel = require("../models/UrlModel.js")
const baseUrl = ' http://localhost:3000'.trim()
const redis = require("redis");

const { promisify } = require("util");


//Connect to redis
const redisClient = redis.createClient(
    17485,   //port
  "redis-17485.c99.us-east-1-4.ec2.cloud.redislabs.com",   //connection string
  { no_ready_check: true }
);
redisClient.auth("aKNGnwFRyre2cu1dkEWHSatbQrMDxOC7", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const urlCreate = async function (req, res) {
    try {
        const { longUrl } = req.body

        if (Object.keys(req.body).length == 0)
            return res.status(400).send({ status: false, message: "please pass some data in body e.g- enter long url" })

        if (!longUrl) {
            return res.status(400).send({ status: false, message: "LongUrl required" })
        }
       
       const isValidLink =/(ftp|http|https|HTTP|HTTPS|FTP):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(longUrl.trim()) 
             
        if(!isValidLink){
            return res.status(400).send({ status: false, error: " Please provide valid URL" });

        }
        //if (validUrl.isUri(longUrl)) {
            
           let urlget = await GET_ASYNC(`${longUrl}`)
           if(urlget) {
            console.log("coming from redis")
           console.log(urlget)
            
            let catch1 = JSON.parse(urlget)
            return res.status(201).send({ status : true, Message:'get from redis', Data:{ longUrl: catch1.longUrl, shortUrl: catch1.shortUrl, urlCode: catch1.urlCode } })
          }

            let lUrl = await urlModel.findOne({ longUrl }).select({longUrl :1,shortUrl:1, urlCode:1,_id :0});
            if (lUrl) {
              await SET_ASYNC(`${longUrl}`, JSON.stringify(lUrl))
                return res.status(200).send({ status: true,msg : "get from db", data: lUrl })
            }

            const urlCode = shortid.generate().toLowerCase()
            const shortUrl = baseUrl + '/' + urlCode    //concat



            let urlData = {
                longUrl,
                shortUrl,
                urlCode
            }
       
            let data = await urlModel.create(urlData)
            //await SET_ASYNC(`${longUrl}`, JSON.stringify(data))
            return res.status(201).send({ status: true,msg : "created in db", data: { longUrl: data.longUrl, shortUrl: data.shortUrl, urlCode: data.urlCode } })
        //}
        // else {
        //     res.status(401).send({ status: false, message: 'Invalid longUrl' })
        // }
    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}


const geturl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode
        let url = await GET_ASYNC(`${urlCode}`)
        if(url)console.log("found in redis")
       
        let data = JSON.parse(url)
        if (url) {
          res.status(302).redirect(data.longUrl)
        }
        else {
          const url = await urlModel.findOne({urlCode})
          if (!url) return res.status(404).json({ status: false, message: 'No URL Found' })
          await SET_ASYNC(`${urlCode}`, JSON.stringify(url))
          // when valid we perform a redirect
          return res.status(302).redirect(url.longUrl)
          //return res.send({ status: true, data: url.longUrl })
        }
    
      }
      catch (err) {
        res.status(500).json({ status: false, message: err.message })
      }
    }
    
module.exports.urlCreate = urlCreate
module.exports.geturl = geturl

