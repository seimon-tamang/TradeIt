const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require("express-session");
const password = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const passport = require('passport');
const alert = require('alert');

const app = express();


app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

//initialize a session
app.use(session({
    secret : "it is a secret",
    resave : false,
    saveUninitialized : false
}));


app.use(passport.initialize());   //initializing passport
app.use(passport.session());   //tell the app to use session through passport

mongoose.set('strictQuery', true);  
mongoose.connect("mongodb://127.0.0.1/tradeIT", { useNewUrlParser : true});


const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    pin:{
        type: Number,
        maximum: 9999
    }
});

userSchema.plugin(passportLocalMongoose); //used to hash and salt our passwords and save in db.

const User = mongoose.model("user",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());





//connect Bank Schema

const connectBankSchema = new mongoose.Schema({
    bankname:{
        type:String,
    },
    accountnumber:String,
    balance:Number
});

const ConnectBank = mongoose.model("Bank",connectBankSchema);

const connectBankTrade = new mongoose.Schema({
    user : String,
    bankname:String,
    accountnumber:String,
    balance:Number
});

const bankTrade = mongoose.model("BankTrade",connectBankTrade);

const connectCryptoSchema = new mongoose.Schema({
    Cryptotype:String,
    username : String,
    password: String
});

const connectCrypto = mongoose.model("Crypto",connectCryptoSchema);

const connectCryptoTrade = new mongoose.Schema({
    user:String,
    Cryptotype:String,
    username : String,
    password: String
});

const connCryptrade = mongoose.model("CryptoTrade",connectCryptoTrade);

const walletSchema = new mongoose.Schema({
    user:String,
    balance:Number,
    pin:String
});

const loadWallet = mongoose.model("wallet",walletSchema);












app.get("/transactions",function(req,res){
    res.render("transactions");
})


app.get("/",function(req,res){
    res.sendFile(__dirname+"/home.html");
});

app.get("/signup",function(req,res){

    // res.sendFile(__dirname+"/form.html");
    res.render("form"); 
});

app.get("/login",function(req,res){

    // res.sendFile(__dirname+"/form.html");
    res.render("form"); 
});

app.get("/connect",function(req,res){
    res.render("connect");
});



let currDigiBal = 0;
app.get("/payment",function(req,res){


    loadWallet.findOne({user:currentUser},function(err,found){
        if(err){
            console.log("Wallet amount dekhauna error.");
        }
        else{

            
             currDigiBal = found.balance;
             console.log(currDigiBal);
             res.render("payment",{Accbalance: currDigiBal});
        }
    })
   
});

app.get("/load",function(req,res){
    res.render("load",{bankName: bn, accountNo:cnaccno, bal:currentBalance});
})

app.get("/dashboard",function(req,res){

    if(req.isAuthenticated()){
        res.render("dashboard");
    }
    else{
        res.redirect("/login")
    }

});



let bn = "NOT CONNECTED";
let cnaccno = "NA"

let currentUser;
let currentBalance = 0;


app.get("/logout",function(req,res){
    req.logout(function(err){
       
        if(err){
            console.log("ERROR LOGGING OUT.")
        } 


        bankTrade.deleteOne({user:currentUser},function(err){
            if(err)
            {
            console.log("Error while deleting bank trade document.");
                
            }
        });

       currentBalance = 0;
       currentUser = "";
       caccno = "NA";
       bn = "NOT CONNECTED";
       
        res.redirect("/");
    });
});




app.post("/signup",function(req,res){

    User.register({username: req.body.username, email: req.body.email, pin:req.body.pinno}, req.body.password , function(err, user){

        if(err){
            console.log(err);
            res.redirect("/signup");
        }
        else{
            passport.authenticate("local")(req, res, function(){

                const createWallet = new loadWallet({
                    user: req.body.username,
                    balance:0,
                    pin:req.body.pinno
               });
           
           
                createWallet.save();
           

                res.redirect("/dashboard");
                currentUser = req.body.username;
            });
        }
    });

    

    
});




app.post("/login",function(req,res){
    
    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user,function(err){
        
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                console.log(user.username);
                currentUser = user.username;
                res.redirect("/dashboard");
            });
        }
    });

});





// CONNECT ACCOUNTS.

app.post("/bank",function(req,res){

    let bankName = req.body.bankName;
    let accNum = req.body.accountNumber;

    console.log(bankName, accNum);

    ConnectBank.findOne({
        bankname: bankName,
        accountnumber:accNum
    }, function(err, foundUser){

        if(!foundUser){
            console.log(foundUser);
            res.send("No User found");
        }else{
            console.log(foundUser);
            alert("User Found.");

            let nameofbank = foundUser.bankname;
            let accno = foundUser.accountnumber;
            let bal = foundUser.balance;

            console.log(nameofbank ,accno, bal);

            bankTrade.find({bankname: nameofbank, accnumber:accno},function(err,foundAccount){
                
                
                if(foundAccount.length!=0){
                    res.send("Account already connected.");
                }
                else{
                    const addbank = new bankTrade({
                        user: currentUser,
                        bankname: nameofbank,
                        accountnumber :accno,
                        balance: bal
                    });
                    
                    addbank.save();
                    currentBalance = bal;
                    bn = nameofbank;
                    cnaccno = accno;
                    console.log(currentBalance);
                    res.send("Account sucessfully connected.");

                }
            })
            
            
        }
    });
});




app.post("/cryptoconnect",function(req,res){

    let crtype = req.body.cryptoName;
    let username = req.body.userNameCrypto;
    let pw = req.body.cryptoPassword;

    connectCrypto.findOne({Cryptotype:crtype, username:username,password:pw},function(err,findCrypto){

        if(err){
            console.log(err);
        }
        else if(!findCrypto){
            console.log(findCrypto);
            res.send("Crypto Account Not Found in Crypto World.");
        }
        else{
            console.log(findCrypto.username);
            alert("Crypto Account Found now connecting....");


            connCryptrade.findOne({user:currentUser},function(err,foundConn){

                if(foundConn){
                    res.send("Account already connected.");
                }
                else{

                    const cryptoacc = new connCryptrade({
                        user : currentUser,
                        Cryptotype:crtype,
                        username:username,
                        password:pw
                    });
    
                cryptoacc.save();
                res.send("Crypto Account succcessfully connected.");
                }

            });

        }

    });

});





//LOAD WALLET

app.post("/loadMoney",function(req,res){

    let amount = req.body.amount;
    let password = req.body.password;

    loadWallet.findOne({
         user:currentUser,
         pin:password
        },function(err,wfound){

        if(err){
            console.log(err);
        }
        else{
            if(!wfound){
                
                console.log("NOT FOUND or check pin.");
            }
            else{
                let walletUser = wfound.user;
                let pin = wfound.pin;
                let bal = wfound.balance;
                console.log("WALLET FOUND WITH BALANCE",bal);

                

                ConnectBank.findOne({user:currentUser},function(err,bfind){
                    
                    if(err){
                        console.log("ERROR INSIDE THE CONNECT BANK PART",err);
                    }
                    else{
                        if(!bfind){
                            console.log("user not found.");

                        }
                        else{
                            console.log("got to the part where transactions are supposed to happen");


                                updatedWalletBal = bal + parseFloat(amount);
                                loadWallet.updateOne({user:currentUser,pin:password},{$set:{balance:updatedWalletBal}},function(err){
                                    if(err){
                                        console.log("ERROR IN WALLET UPDATE PART.",err);
                                    }
                                
                                    updatedBankBal = bfind.balance - parseFloat(amount);
                                
                                    ConnectBank.updateOne({user:currentUser},{$set:{balance:updatedBankBal}},function(err){
                                        if(err){
                                            console.log("bank balance update ma error aayo",err);
                                        }
                                    });

                                    bankTrade.updateOne({user:currentUser},{$set:{balance:updatedBankBal}},function(err){
                                        if(err){
                                            console.log("Wallet connected bank ma error ayo updation ma.");
                                        }
                                    });

                                    currentBalance = updatedBankBal;
                                });
                        }
                    }
                });

                
                res.redirect("/load");
            }
        }
        
    });

});











// Payment System 

app.post("/digiPay",function(req,res){

    var amt = req.body.Tamount;
    var recipient_name = req.body.Tname;
    var tpin= req.body.Tpin;


    if(currDigiBal >= amt){
        loadWallet.findOne({user:currentUser,pin:tpin},function(err,wf){
            if(!wf){
                console.log("Wallet sender not found error.");
            }else{
                
                let upd_sender_bal = currDigiBal - parseFloat(amt);


                loadWallet.findOne({user:recipient_name},function(err,recipient){

                    if(!recipient){
                        console.log("No Recipient Account.")
                    }
                    else{
                            console.log(recipient.balance," is the reciever's balance.");
                            let upd_reciever_bal = recipient.balance + parseFloat(amt);
                            

                            loadWallet.updateOne({user:recipient_name},{$set:{balance:upd_reciever_bal}},function(err){
                                console.log("Transaction success: Recipient Balance is :", upd_reciever_bal);
                            });
                    }
                });
                

                loadWallet.updateOne({user:currentUser},{balance:upd_sender_bal},function(err){
                    if(err){
                        console.log("Error")
                    }
                    else{
                        console.log("Updated balance of current user");
                    }
                });


            }
        });                               
    }

    res.redirect("/payment#digiWallet");


});





app.listen(3000,function(req,res){
    console.log("App started at port 3000.");
});






