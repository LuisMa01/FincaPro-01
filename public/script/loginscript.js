function seePassword(){
    let myPassword = document.getElementById("password");
    
    if(myPassword.type == 'password'){
        myPassword.type = 'text';
    }
    else{
        myPassword.type = 'password'
    }
    return;
}
/*
function submitButton(){
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    if(username.toLowerCase() === 'stradivariuskane' && password.toLowerCase() === 'lacuchacara'){
        document.getElementById('error_text').innerText = '';
        window.open('https://es.wikipedia.org/wiki/Agua');
        return;
    }
    else{
        document.getElementById('error_text').innerText = '';
        setTimeout(()=>{document.getElementById('error_text')
        .innerText = 'Usuario o contraseña incorrectos';}, 300);
    }
    return;
}
*/
function clean(){
        document.getElementById('error_text').innerText = '';
        return;
}