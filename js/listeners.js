

document.getElementById("uploadImgPtr").addEventListener("click", function() {
    document.getElementById("uploadImg").click();
});

document.getElementById("uploadImg").addEventListener("change", function() {
    console.log(this.files[0]);
    transformFileToImg(this.files[0]);
});



function transformFileToImg(file) {
    const reader = new FileReader();
    reader.onload = (function(e) {
      var img = new Image();
      img.onload = processImageOnLoad;
      img.src = e.target.result;
    });
    reader.readAsDataURL(file);
}
