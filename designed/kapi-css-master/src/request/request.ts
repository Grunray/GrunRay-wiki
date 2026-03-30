import axios from 'axios'
import Cookie from 'js-cookie';

const instance = axios.create({
    baseURL:'http://120.24.64.5:8088/mall-admin',
    timeout:15000

})

// 请求拦截器
instance.interceptors.request.use(
    config => {
        // 两种方式都可以
        config.headers.Authorization = Cookie.get("token");
        // config.headers['Authorization'] = Cookie.get("token");
        return config;
    },
    err=>{
        return Promise.reject(err);
    }
)
// 返回值拦截器
instance.interceptors.response.use(
    // res = 后端返回值以及请求配置类
    config => {
        return config.data;
    },
    err=>{
        return Promise.reject(err);
    }
)

export default instance;