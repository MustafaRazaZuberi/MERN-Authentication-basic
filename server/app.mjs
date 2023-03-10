
import cors from "cors"
import mongoose from "mongoose"
import express from "express"
import jwt from "jsonwebtoken"
import cookieParser from 'cookie-parser'
import {
    stringToHash,
    varifyHash,
} from "bcrypt-inzi"


const SECRET = process.env.SECRET || "topsecret"


const app = express()
const port = process.env.PORT || 4000;
let todos = [];



let todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    classId: String,
    createdAt: { type: Date, default: Date.now() }
})
const todoModel = mongoose.model('todos', todoSchema)


const userSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true },

    age: { type: Number, min: 17, max: 65, default: 18 },
    isMarried: { type: Boolean, default: false },

    createdOn: { type: Date, default: Date.now },
});
const userModel = mongoose.model('Users', userSchema);


app.use(express.json())
app.use(cookieParser())

const corsOptions = {
    origin: 'http://localhost:3002',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));



app.post("/signup", (req, res) => {
    let body = req.body;
    if (!body.firstName
        || !body.lastName
        || !body.email
        || !body.password
    ) {
        res.status(400).send(
            `required fields missing, request example: 
                {
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "abc@abc.com",
                    "password": "12345"
                }`
        );
        return;
    }

    req.body.email = req.body.email.toLowerCase()

    // check if user already exist // query email user
    userModel.findOne({ email: body.email }, (err, user) => {
        if (!err) {
            console.log("data: ", user);

            if (user) { // user already exist
                console.log("user already exist: ", user);
                res.status(400).send({ message: "user already exist,, please try a different email" });
                return;

            } else { // user not already exist

                stringToHash(body.password).then(hashString => {

                    userModel.create({
                        firstName: body.firstName,
                        lastName: body.lastName,
                        email: body.email.toLowerCase(),
                        password: hashString
                    },
                        (err, result) => {
                            if (!err) {
                                console.log("data saved: ", result);
                                res.status(201).send({ message: "user is created" });
                            } else {
                                console.log("db error: ", err);
                                res.status(500).send({ message: "internal server error" });
                            }
                        });
                })

            }
        } else {
            console.log("db error: ", err);
            res.status(500).send({ message: "db error in query" });
            return;
        }
    })
});



app.post("/login", (req, res) => {

    let body = req.body;

    if (!body.email || !body.password) { // null check - undefined, "", 0 , false, null , NaN
        res.status(400).send(
            `required fields missing, request example: 
                {
                    "email": "abc@abc.com",
                    "password": "12345"
                }`
        );
        return;
    }
    req.body.email = req.body.email.toLowerCase()


    // check if user already exist // query email user
    userModel.findOne(
        {email: body.email },
        // { email: 1, firstName: 1, lastName: 1, password: 1 },
        // "email -password",
        "email firstName lastName password",
        (err, data) => {
            if (!err) {
                console.log("data: ", data);

                if (data) { // user found
                    varifyHash(body.password, data.password).then(isMatched => {

                        console.log("isMatched: ", isMatched);

                        if (isMatched) {

                            const token = jwt.sign({
                                _id: data._id,
                                email: data.email,
                                iat: Math.floor(Date.now() / 1000) - 30,
                                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
                            }, SECRET);

                            console.log("token: ", token);

                            res.cookie('Token', token, {
                                maxAge: 86_400_000,
                                httpOnly: true
                            });

                            res.send({
                                message: "login successful",
                                profile: {
                                    email: data.email,
                                    firstName: data.firstName,
                                    lastName: data.lastName,
                                    _id: data._id
                                }
                            });
                            return;
                        } else {
                            console.log("password did'nt match");
                            res.status(401).send({ message: "Incorrect email or password" });
                            return;
                        }
                    })

                } else { // user not already exist
                    console.log("user not found");
                    res.status(401).send({ message: "Incorrect email or password" });
                    return;
                }
            } else {
                console.log("db error: ", err);
                res.status(500).send({ message: "login failed, please try later" });
                return;
            }
        })



})


app.use((req, res, next) => {
    console.log("req.cookies: ", req.cookies);

    if (!req?.cookies?.Token) {
        res.status(401).send({
            message: "include http-only credentials with every request"
        })
        return;
    }
    jwt.verify(req.cookies.Token, SECRET, function (err, decodedData) {
        if (!err) {

            console.log("decodedData: ", decodedData);

            const nowDate = new Date().getTime() / 1000;

            if (decodedData.exp < nowDate) {
                res.cookie('Token', '', {
                    maxAge: 0,
                    httpOnly: true
                });
                res.status(401).send({ message: "token expired" })
            } else {

                console.log("token approved");

                req.body.token = decodedData
                next();
            }
        } else {
            res.status(401).send("invalid token")
        }
    });
})







app.post("/logout", (req, res) => {

    res.cookie('Token', '', {
        maxAge: 0,
        httpOnly: true
    });

    res.send({ message: "Logout successful" });
})


















app.use('/', (req, res) => {
    res.send("<h1>Learning mongodb 1st class</h1>")
})





app.listen(port, () => {
    console.log(`server app is listenning on port ${port}`)
})




/////////////////////////////////////////////////////////////////////////////////////////////////
let dbURI = "mongodb+srv://mustafa:mustafa123@cluster0.ji1i6lh.mongodb.net/1stdatabase?retryWrites=true&w=majority";
// let dbURI = 'mongodb://localhost/mydatabase';
mongoose.connect(dbURI);


////////////////mongodb connected disconnected events///////////////////////////////////////////////
mongoose.connection.on('connected', function () {//connected
    console.log("Mongoose is connected");
    // process.exit(1);
});

mongoose.connection.on('disconnected', function () {//disconnected
    console.log("Mongoose is disconnected");
    process.exit(1);
});

mongoose.connection.on('error', function (err) {//any error
    console.log('Mongoose connection error: ', err);
    process.exit(1);
});

process.on('SIGINT', function () {/////this function will run jst before app is closing
    console.log("app is terminating");
    mongoose.connection.close(function () {
        console.log('Mongoose default connection closed');
        process.exit(0);
    });
});
////////////////mongodb connected disconnected events///////////////////////////////////////////////





















// mongodb+srv://mustafa:<password>@cluster0.ji1i6lh.mongodb.net/?retryWrites=true&w=majority