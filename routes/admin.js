var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const { response } = require('express');
const productHelpers = require('../helpers/product-helpers');

/* GET users listing. */
router.get('/', function(req, res, next) {
 

  productHelper.getAllProduct().then((products)=>{
    console.log(products)
    res.render('admin/view_products',{admin:true,products})
  })
 
});

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){

      req.session.user=response.user
      req.session.user.logggedIn=true
      
      res.redirect('/')
    }
    else{
      req.session.loginErr=true
      res.redirect('/login')

    }
  })
})



router.get('/add-product',function(req,res){
  res.render('admin/add-product')

})
router.post('/add-product',(req,res)=>{
  console.log(req.body)
  console.log(req.files.image)

  productHelper.addProduct(req.body,(id)=>{
    let image = req.files.image
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render("admin/add-product")
      }
      else{
        console.log(err)
      }
    })
    
  })

})
router.get('/delete-product/:id',(req,res)=>{
  let proId =req.params.id
  
  productHelper.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })


})
router.get('/edit-product/:id',async(req,res)=>{
  let product = await productHelper.getProductDetailes(req.params.id)


  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    let id = req.params.id
    res.redirect('/admin')
    if(req.files.image){
      let image = req.files.image
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})

module.exports = router;
