

module.exports = initMixin = (Vax) => {

    Vax.prototype.init = (me, source) => {
        // optimise default source
        me._source = source;

        // build xml
        me.xmlParse(me, source)

        // table.name required and unique
        if (me._json && me._json.vax && me._json.vax.table) {
            let names = [];
            if (me._json.vax.table instanceof Array) {
                me._json.vax.table.forEach((table) => {
                    if (!table.name || names.includes(table.name)) {
                        throw new Error(`ERROR：.vax.xml配置文件中的每个table中name必填且唯一 。${JSON.stringify(table)}`);
                    }
                    else {
                        table.name = table.name.replace(/\./g,'_')
                        names.push(table.name)
                    }
                });
            }
            else {
                if (!me._json.vax.table.name) {
                    throw new Error(`ERROR：.vax.xml配置文件中的每个table中name必填且唯一 。${JSON.stringify(me._json.vax.table)}`);
                }
                else{                    
                    me._json.vax.table.name = me._json.vax.table.name.replace(/\./g,'_')
                }
            }
        }

        // import hookcontroller
        me._hook = [];

        // render
        me._stackState = [];
        me._stackGetter = [];
        me._stackMutation = [];
        me._stackAction = [];
        if (me._json && me._json.vax && me._json.vax.table) {
            if (me._json.vax.table instanceof Array) {
                me._json.vax.table.forEach((table) => {
                    me.render(me, me.hook(table))
                })
            }
            else {
                me.render(me, me.hook(me._json.vax.table))
            }
        }

        // merge
        return `(function(){
                const ExpiredStorage = require('expired-storage');
                const vue = require('vue');
                const axios = require('axios');
                const cache = new ExpiredStorage();
                ${Array.from(new Set(me._hook)).join(`
                `)}
                return {
                    state: {
                        ${me._stackState.join(',')}
                    },
                    getters: {
                        ${me._stackGetter.join(',')}
                    },
                    mutations: {
                        ${me._stackMutation.join(',')}
                    },
                    actions: {
                        ${me._stackAction.join(',')}
                    }
                } 
            }())     
        `
    }

    Vax.prototype.render = (me, table) => {
        Vax.buildVuex(table, (vuex) => {
            Vax.buildCache(table, vuex, (vuex, cache) => {
                Vax.buildAxios(table, vuex, cache, (vuex, cache, axios) => {
                    me._hook.push(`
                        ${!table.hook ? '' : 'const ' + table.hookClass + " = require('" + table.hook + "');"}
                    `)
                    vuex.state && me._stackState.push(`
                        ${vuex.state}
                    `)
                    vuex.getter && me._stackGetter.push(`
                        ${vuex.getter}
                    `)
                    vuex.mutation && me._stackMutation.push(`
                        ${vuex.mutation}
                    `)
                    me._stackAction.push(`            
                        ${vuex.action}{        
                            ${!table.hookClass ? '' : 'if(' + (table.hookClass + '.beforePromise && ' + table.hookClass + '.beforePromise({ commit, state },param)') + '===false){reject();return;}'}                    
                            return new Promise(function(resolve,reject){                                
                                ${cache.template}
                                ${axios.template}
                                ${vuex.template}
                            });
                        }                    
                    `)
                })
            })
        })
    }
}
