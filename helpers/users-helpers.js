var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
const { response } = require('express')
var objectId = require('mongodb').ObjectID
const Razorpay=require('razorpay')
const { promises } = require('dns')
const { resolve } = require('path')
var instance = new Razorpay({
    key_id: 'rzp_test_MLGKhS6HL3KldM',
    key_secret: 'SeajYNgUZuu193R4knI5vBQR',
  });


module.exports = {
    doSignip: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.user_collection).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })
        })


    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.user_collection).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login  success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log("login failed")
                        resolve({ status: false })
                    }
                })

            }
            else {
                console.log("not user")
                resolve({ status: false })

            }
        })
    },
    addToCart: (proid, userid) => {
        let proObj = {
            item: objectId(proid),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CAERT_collection).findOne({ user: objectId(userid) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proid)
              
                if (proExist != -1) {
                    db.get().collection(collection.CAERT_collection).updateOne({ user: objectId(userid), 'products.item': objectId(proid) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                }
                else {
                    db.get().collection(collection.CAERT_collection).updateOne({ user: objectId(userid) }, { $push: { products: proObj } }).then((response) => {
                        resolve()
                    })

                }



            }
            else {
                let cartobj = {
                    user: objectId(userid),
                    products: [proObj]
                }
                db.get().collection(collection.CAERT_collection).insertOne(cartobj).then((response) => {
                    resolve()

                })
            }
        })
    },
    getCartProducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CAERT_collection).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'


                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
           
            resolve(cartItems)
        })
    },
    getCartCount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CAERT_collection).findOne({ user: objectId(userid) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuntity: (details) => {
        count = parseInt(details.count)
        quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (count == -1 && quantity == 1) {
                db.get().collection(collection.CAERT_collection).updateOne({ _id: objectId(details.cart) },
                    { $pull: { products: { item: objectId(details.product) } } }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })

            } else {

                db.get().collection(collection.CAERT_collection).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': count }
                    }).then((response) => {
                        resolve({status:true})
                    })
            }

        })
    },
    removeProduct: (details) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CAERT_collection).updateOne({ _id: objectId(details.cart) },
                { $pull: { products: { item: objectId(details.product) } } }
            ).then((response) => {
                resolve({ removeProduct: true })
            })

        })

    },
   
    getCartCount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CAERT_collection).findOne({ user: objectId(userid) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })

    }, getTotalAmount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let Total = await db.get().collection(collection.CAERT_collection).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'


                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                },
                
                {
                    $group: {
                        _id:null,
                        total: { $sum:{$multiply:[ {'$toInt': '$quantity'},{ '$toInt': '$product.price'}] } }
                    }
                }

            ]).toArray()
            console.log(Total)
            resolve(Total[0].total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total)
            let status =order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    number:order.Mobile,
                    address:order.Address,
                    pincode:order.Pincode
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                product:products,
                getTotalAmount:total,
                status:status,
                date:new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CAERT_collection).removeOne({user:objectId(order.userId)})
                console.log(response.ops[0]._id)
                resolve(response.ops[0]._id)
            })

        })

    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart =await db.get().collection(collection.CAERT_collection).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },
    Order:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let order= await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
                resolve(order)
           
           

        })
    },
    getOrderedProduct:(userId)=>{
        return new Promise(async(resolve,reject)=>{

        })
    },
    OrderProduct:(orderid)=>{
        return new Promise(async(resolve,reject)=>{
            let orderitem = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderid) }
                },
                {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'


                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                },
            ]).toArray()
            console.log(orderitem)
            resolve(orderitem)
        })
    },generateRazorpay:(orderId,amount)=>{
        return new Promise((resolve,reject)=>{
           
            var options = {
                amount: amount*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err)
                  }else{
                console.log("new ordwe",order);
                resolve(order)
                  }
              })
        })

    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'SeajYNgUZuu193R4knI5vBQR');

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }
            else{
                reject()
            }
        })
    },
    changePaymentStatuse:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })

    }

}