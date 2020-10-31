var db = require('../config/connection')
var collection =require('../config/collections')
const { response } = require('express')
var objectId = require('mongodb').ObjectID
module.exports={

    addProduct:(product, callback)=>{
        
      
        db.get().collection('product').insertOne(product).then((data)=>{
            
            callback(data.ops[0]._id)

        })

    },
    getAllProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            let products =await db.get().collection(collection.product_collection).find().toArray()
            resolve(products)
        })
    },
      deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.product_collection).removeOne({_id:objectId(proId)}).then((response)=>{
                resolve(response)
                console.log(response)
            })
        })

    },
    getProductDetailes:(proid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.product_collection).findOne({_id:objectId(proid)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proid,productDetailes)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.product_collection).updateOne({_id:objectId(proid)},{
                $set:{
                    Name:productDetailes.Name,
                    Category:productDetailes.Category,
                    Description:productDetailes.Description,
                    price:productDetailes.price
                }
            
            }).then((response)=>{
                resolve()
            })
                
           
        })
    }
}