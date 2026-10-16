
const form_button = document.getElementById("form_send");
const form_name = document.getElementById("form_name");
const form_email = document.getElementById("form_email");
const form_res = document.getElementById("form_res");

form_button.onclick = (e) => {
  let body = new URLSearchParams();
  body.set("name", form_name.value);
  body.set("email", form_email.value);
  fetch("/subscribe", {method: "POST", body: body.toString()})
    .then(res=>{
      if (!res.ok) form_res.textContent = "Error";
      return res.text();
    })
    .then(data=> form_res.textContent = data);
}
