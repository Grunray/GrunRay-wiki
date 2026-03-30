import { App } from 'vue';
import { createStore } from 'vuex';

interface State{
    menus:MenuItem[]
}
interface MenuItem{
    id:number;
    parentId:number;
    title:string;
    hidden:number,
    children?:MenuItem[];
}

const store = createStore<State>({
    state() {
        return {
            menus: []
        }
    },
    getters:{
    },
    mutations:{
    },
    actions:{
        
    },
    modules:{

    }
});

export const initStore = (app: App<Element>) => {
    app.use(store)
}

export default store;