var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
const userHelpers = require('../helpers/users-helpers');
const { response } = require('express');




const verifyLogin = (req,res,next)=>{
  if(req.session.user.logggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function(req, res, next) {
  let user =req.session.user
  let cartcount = null
  if(req.session.user){
  cartcount =await userHelpers.getCartCount(req.session.user._id)
  }
  
  productHelper.getAllProduct().then((products)=>{
   
    res.render('index', {products,user,cartcount});
  })
  
});
router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }
  else{
  res.render('user/login',{"loginrr":req.session.loginErr})
  req.session.loginErr=false
  }
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
})
router.post('/signup',(req,res)=>{
  userHelpers.doSignip(req.body).then((response)=>{
    console.log(response)
    req.session.user.logggedIn=true
    req.session.user=response
    res.redirect('/')
    

  })
  
})
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

router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let user =req.session.user
    let products= await userHelpers.getCartProducts(req.session.user._id,)
    let totalValue =0
    if(products.length>0){
      totalValue =await userHelpers.getTotalAmount(req.session.user._id)
    }
   
    console.log(products)

    res.render('user/cart',{products,user,totalValue})
 
 
})
router.get('/add-to-cart/:id',(req,res)=>{
  console.log('api call')
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
   res.json({status:true})

  })

})
router.post('/change-product-quantity',(req,res)=>{
  userHelpers.changeProductQuntity(req.body).then(async(response)=>{
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
    
  })
})
router.post('/remove-product',(req,res)=>{
  console.log(req.body)
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json(response)
    
  })
})
router.get('/place-order',verifyLogin,async(req,res)=>{
  
 
  let total = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/placeOrder',{total,user:req.session.user})

    
  
 
 
})
router.post('/place-order',async(req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice =await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payement-method']=='COD'){
      res.json({codSuccess:true})
    }
    else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)

      })
    }
    

  })
  console.log(req.body)
})

router.get('/orderComplited',verifyLogin,(req,res)=>{
  let user =req.session.user
  res.render('user/ordercomplied',{user})
})
router.get('/orders',verifyLogin,async(req,res)=>{
  let user =req.session.user
 let order= await userHelpers.Order(req.session.user._id)
    res.render('user/orders',{user,order})
    
  
 
})
router.get('/orderdProduct/:id',verifyLogin,async(req,res)=>{
  let products= await userHelpers.OrderProduct(req.params.id)
  

  res.render('user/product',{user:req.session.user,products})
})
router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatuse(req.body['order[receipt]']).then(()=>{
      console.log('payment successful')
      res.json({status:true})
    })

  }).catch((err)=>{
    console.log(err)
    res.json({status:false})
  })
})


module.exports = router;
 