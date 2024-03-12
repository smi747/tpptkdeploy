require('dotenv').config();
var fs=require('fs');
const {Sequelize, Op} = require('sequelize');

var cattree=fs.readFileSync('cattree.json', 'utf8');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DS_PASSWORD,
     {
       host: process.env.DB_HOST,
       port: process.env.DB_PORT,
       dialect: 'mysql'
     }
   );

sequelize.authenticate();

const Positions = require("./Positions")(sequelize);

let datadb;
async function get_db(ofs, lim, selcat, searchinp, filt_sz, filt_mk) {
    console.log("get_db()_called");
    let res = [{count: 0, rows: []}, {count: 0, rows: []}, {count: 0, rows: []}];
    if (selcat == "search" || selcat == "search_") {
        res = [await Positions.findAndCountAll({where: {
            [Op.and]: [
                searchinp.split(" ").map(x => {return {[Op.or]: [{'name': { [Op.like]: '%' + x + '%' }}, {'art': { [Op.like]: '%' + x + '%' }}]}})
            ]
          },
            offset: ofs, limit: lim}), {count: 0, rows: []}, {count: 0, rows: []}]
    }
    else {
        if (selcat !="") {
            const where_tmp = {cat:selcat}
            if (filt_sz != "Все размеры")
                where_tmp.size = filt_sz;
            if (filt_mk != "Все марки")
                where_tmp.mark = filt_mk;
            res = [await Positions.findAndCountAll({
                where: where_tmp,
                offset: ofs, limit: lim}),
                ]
        }
    }
    return res;
}

var _getAllFilesFromFolder = function(dir) {

    var filesystem = require("fs");
    var results = [];
  
    /*filesystem.readdirSync(dir).forEach(function(file) {
  
        file = dir+'/'+file;
        var stat = filesystem.statSync(file);
  
        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file))
        } else results.push(file);
  
    });*/
  
    return filesystem.readdirSync(dir);
  
  };

const userlist = [{id: 0, email: "admin", password: "123"}]

const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');


function initializePassport(passport, getUserByEmail, getUserById) {
    const authenticateUser = (email, password, done) => {
        const user = getUserByEmail(email);
        if (user == null)
            return done(null, false);
        if (password == user.password)
            return done(null, user)
        else
            return done(null, false)
    }
    passport.use(new localStrategy({usernameField: 'login'}, authenticateUser))
    passport.serializeUser((user, done) => { done(null, user.id) })
    passport.deserializeUser((id, done) => { return done(null, getUserById(id)) })
}
initializePassport(passport, email => userlist.find(user => user.email === email), id => userlist.find(user => user.id === id));

const express = require("express");
var send = require('./mail.js');
  
const app = express();
// создаем парсер для данных в формате json
const jsonParser = express.json();
  
app.post("/user", jsonParser, function (request, response) {
    console.log(request.body);
    if(!request.body) return response.sendStatus(400);
     
    response.json(request.body); // отправляем пришедший ответ обратно
});

const urlencodedParser = express.urlencoded({extended: false});
const child_process = require('child_process');
const { spawn,spawnSync, exec } = require('child_process');
const multer = require('multer');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const request = require("request");
app.post("/", upload.single('form-reqs'), function (req, res) {
    let secretKey = "6LeBGlQpAAAAAHJaQlMm1QDG1NR2WFK5FPVPMC1A"; // Put your secret key here.
    let verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
    // Google will respond with success or error scenario on url request sent.
    request(verificationUrl,function(error,response,body) {
    body = JSON.parse(body);
    // Success will be true or false depending upon captcha validation.
    if(body.success !== undefined && !body.success) {
    return res.redirect(303, '/prgf');
    }
    if(!req.body) return res.sendStatus(400);
    res.redirect(303, '/prg');
    let childProcess = child_process.fork('mail.js');
    childProcess.send({0: req.body, 1: req.file})
    console.log(req.body);
    });
});

app.get('/prg', (req, res) => res.redirect(303, '/?ordered=1'));
app.get('/prgf', (req, res) => res.redirect(303, '/?ordered=2'));


app.use(session({secret: "SECRET", resave:false, saveUninitialized:false, cookie: { maxAge: 60 * 60 * 1000 }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(urlencodedParser);

const {Transform} = require('node:stream');

app.get('/admin', checkAuthenticated, (req, res) => {
    const replacementTransform = new Transform()
    const content = fs.readFileSync("app/index.html");
    replacementTransform._transform = function(data, encoding, done) {
        const str = data.toString().replace('~~~', content)
        this.push(str)
        done()
    }

    res.write('<!-- Begin stream -->\n');
    let stream = fs.createReadStream('admin.html')
    stream.pipe(replacementTransform)
    .on('end', () => {
        res.write('\n<!-- End stream -->')
    }).pipe(res).on('end', () => {res.sendFile(__dirname + "//admin.html");})

    
});
app.get('/login', (req, res) => {
    res.sendFile(__dirname + "//app/auth.html");
});

const storageConfig = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, "uploads");
    },
    filename: (req, file, cb) =>{
        cb(null, file.originalname);
    }
});
app.post("/admin", checkAuthenticated, multer({ storage: storageConfig }).single('form-reqs'), function (req, res) {
    //res.sendFile(__dirname + "//admin.html");
    if (req.query.p == 1) {
        if (!req.file) {
            res.send(`<p>Пустой файл!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
        }
        else {
            console.log("file processing")
            const command = spawn('python3', ["updatedb.py"]);
            command.stdin.write("uploads/" + req.file.filename);
            command.stdin.end();
            let datasend = ""
            command.stdout.on('data', function (data) {
                datasend += data.toString();
                console.log(data);
            });
            command.on('close', (code) => {
                if (code !== 0) {
                console.log(`grep process exited with code ${code}`);
                res.send(`<p>Возникла ошибка во время обработки файла! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
                }
                else {
                cattree=fs.readFileSync('cattree.json', 'utf8');
                const command_3 = exec('mysql -padmin < mysqlscript');
                command_3.on('close', (code) => {
                    if (code !== 0) {
                    console.log(`2grep process exited with code ${code}`);
                    res.send(`<p>Возникла ошибка во время записи в базу данных! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`)
                    }
                    else {
                    res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);}})
                }});
            }
    }
    
    if (req.query.p == 2) {
        console.log("index.html processing")
        fs.writeFile('app/index.html', req.body["form-html"], err => {
        if (err) {
            console.error(err);
            res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
        } else {
            res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
        }
        });
    }
    if (req.query.p == 3)
    {
        fs.writeFile('app/otherpages/'+req.query.page, req.body["form-html"], err => {
            if (err) {
                console.error(err);
                res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            } else {
                fs.rename('app/otherpages/'+req.query.page, 'app/otherpages/'+req.body["form-name"], err => {
                    if (err) {
                        console.error(err);
                        res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
                    }
                    else
                        res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            })
            }});
        console.log(req.query.page)
    }
    if (req.query.p == 4)
    {
        fs.unlink('app/otherpages/'+req.query.page, err => {
            if (err) {
                console.error(err);
                res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            } else {
                res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            }
            });
        console.log(req.query.page)
    }
    if (req.query.p == 5)
    {
        fs.writeFile('app/otherpages/'+req.body["form-name"], `<style>
        .pagestyle {
        color: white;
        padding: 0 100px;
        font-family: "Noto Sans", sans-serif;
        font-size: 21px;
        text-align: center;
        }
        @media screen and (max-width: 767px) {
            .pagestyle {
            padding: 0 50px;
            font-size: 16px;
            }
        }
        @media screen and (max-width: 450px) {
            .pagestyle {
            padding: 0 20px;
            font-size: 15px;
            }
        }
        </style>
        <p class="pagestyle"><!--Пишите свой текст здесь;)--></p>`, err => {
            if (err) {
                console.error(err);
                res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            } else {
                res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);

            }});
        console.log(req.query.page)
    
    }
});

const storage_photo = multer.memoryStorage()
app.post("/change_photo", checkAuthenticated, multer({ storage: storage_photo }).single('form-photo'), function (req, res) {
    if (req.file) {
        fs.writeFile('app/images/slider/'+req.query.dir+"/"+req.file.originalname, req.file.buffer, err => {
                if (err) {
                    console.error(err);
                    res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
                } else {
                    res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
                }});
            }
            else {
                res.send(`<p>Пустой файл!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            }
});

app.post("/delete_photo", checkAuthenticated, multer({ storage: storage_photo }).single('form-photo'), function (req, res) {
        fs.unlink('app/images/slider/'+req.query.dir+"/"+req.query.ph, err => {
            if (err) {
                console.error(err);
                res.send(`<p>Возникла ошибка! Повторите попытку или обратитесь к системному администратору</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            } else {
                res.send(`<p>Успешно завершено!</p><p>Вернитесь в <a href="/admin">панель администратора</a> или на <a href="/">главную страницу</a></p>`);
            }
            });
        console.log(req.query.page)
});



app.post('/login', passport.authenticate('local', {
    successRedirect: "/admin",
    failureRedirect: "/login",

}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated())
        return next()
    res.redirect("/login");
}

app.get("/", function(request, response){
      
    if (request.query.q === "test") {
        get_db().then((res) => {
            let tmp = JSON.stringify(res);
            response.json(tmp);});
        return;
    }
    response.sendFile(__dirname + "//app/index.html");
});




app.get('/express_backend', (req, res) => { //Строка 9
    get_db(parseInt(req.query.ofs), parseInt(req.query.lim), req.query.selcat, req.query.searchinp, req.query.filt_size, req.query.filt_mark).then((data) => {res.send({ express: JSON.stringify(data[0]),catinfo: cattree })})
     //Строка 10
  }); //Строка 11
  
app.get('/get_otherpages', (req, res) => {
let tmp = _getAllFilesFromFolder("app/otherpages");
res.send({ express: JSON.stringify(tmp)})
});

app.get('/get_photos', (req, res) => {
    let tmp = ["01", "02", "03", "04", "05", "06", "07"];
    let result = [];
    
    tmp.map(x => {
        console.log(x)
        if (!fs.existsSync("app/images/slider/"+x)){
            fs.mkdirSync("app/images/slider/"+x);
        };result.push(_getAllFilesFromFolder("app/images/slider/"+x))});
    res.send({ express: JSON.stringify(result)})
    });


app.use(express.static('app'));
  
app.listen(3000);

