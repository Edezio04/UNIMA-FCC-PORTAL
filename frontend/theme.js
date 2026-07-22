// ===========================
// GLOBAL DARK MODE SYSTEM
// ===========================


document.addEventListener("DOMContentLoaded",()=>{


    const savedTheme = localStorage.getItem("theme");


    if(savedTheme === "dark"){

        document.body.classList.add("dark");

    }



});



// Function to change theme

function toggleDarkMode(){


    document.body.classList.toggle("dark");


    if(document.body.classList.contains("dark")){


        localStorage.setItem(
            "theme",
            "dark"
        );


    }

    else{


        localStorage.setItem(
            "theme",
            "light"
        );


    }


}