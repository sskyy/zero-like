var _ = require('lodash')

function IsNum(s)
{
  if(s!=null){
    var r,re;
    re = /^[1-9]\d*/i; //\d表示数字,*表示匹配多个数字
    r = s.match(re);
    return (r==s)?true:false;
  }
  return false;
}


module.exports = {
  route : {},
  models : require('./models'),
  expand : function( module ){
    var root = this,
      models = root.dep.model.models

    _.forEach( module.like, function( config, modelName){
      root.route['POST /'+modelName+"/:id/like"] = function( req, res){
        var uid = config.anonymous?req.ip:req.session.user.id,
          nid = req.param("id")

        if( !config.anonymous  && !req.session.user.id){
          console.log( req.session)
          return res.status(403).json({msg:'please login first'})
        }

        if( config.limit ){
          models['like'].findOne({uid:uid,nid:nid}).then(function(record){
            if( record && !(record.count < config.limit)){
              return res.status(406).json({msg:'out of limit'})
            }
            updateModel( record )

          }).catch(function(err){
            res.status(500).json({msg:err})
          })
        }else{
          updateModel()
        }

        function updateModel( record){
          models[modelName].findOne( nid).then(function( model){
            if( !model ){
              res.status(404).json({msg:[model,req.param("id")].join(" ") + " not fount"})
            }else{
              req.bus.fcall(modelName+".like", model, function(){
                req.bus.fire(modelName+'.update',{id:nid},{like:(model.like||0)+1}).then(function(){
                  if( record ){
                    models['like'].update({id:record.id},{count:record.count+1}).then(respond)
                  }else{
                    models['like'].create({uid:uid,nid:nid,count:1}).then(respond)
                  }

                  function respond(){
                    res.json(_.find(req.bus.data(modelName+".update"),{id:IsNum(nid)?parseInt(nid):nid}))
                  }
                })

              })
            }
          })
        }
      }
    })
  },
  bootstrap : {
    "function" : function(){
      this.dep.request.expand(this)
      console.log("like bootstrap done")
    },
    "order" : {before:"request.bootstrap"}
  }
}