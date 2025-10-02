const mongoose = require('mongoose');
const {Schema} = mongoose;
const userSchema =  new Schema({
     FullName :{
        type:String,
        required:true,
        minlength:2,
        maxLength:20
    },
    EndrollmentNumber :{
        type:String,
        required:true,
        minlength:3,
        maxLength:20
    },
    password:{
        type:String,
        required:true,
        minlength:5,
    },
    role:{
        type:String,
        enum:["Student","Teacher","Admin"]
    },
    SubjectName:{
        type:String
    },
    SubjectCode:{
        type:String
    }

},{timestamps:true});
const User = mongoose.model("User",userSchema);
module.exports = User;