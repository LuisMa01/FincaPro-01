let input = document.getElementById("inputUser");

input.addEventListener('keyup', (e) => {

    let tex = e.target.value;

    console.log(tex.trim())

    input.value=tex.trim()
})