//pages-index

const pug = require('pug')

exports.signin = function(){
    //return('kekekek!!!');
    return pug.compileFile('views/signin.pug')();
}
