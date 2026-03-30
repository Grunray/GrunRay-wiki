import request from "@/request/request";
// 类型别名 T= {} 默认为空对象
type PromiseType<T = {}> = Promise<BaseRes<T>>;
interface BaseRes<T>{
    code:number;
    data:T;
    message:string;
}
interface AdinUserLoginReq {
    username:string;
    password:string;
}
interface AdminUserLoginData{
     token:string;
    tokenHead:string;
}

interface AdinInfoData {
   menus:[],
   roles:[],
   icon:any,
   username:string
}


interface AdminInfoListData {
    list:AdminParam[]
 }

 interface AdminParam {
    id?: number;
    email?: string;
    createTime?: string;
    icon?: string;
    nickName?: string;
    note?: string;
    password?: string;
    username?: string;
    status?: number;
    loginTime?: string;
  }
 interface AdminInfoListReq {
    keyword:string;
    pageSize:number;
    pageNum:number;
 }

export const adminLoginApi = (data:AdinUserLoginReq):PromiseType<AdminUserLoginData> => request.post(
    '/admin/login',
    data
);

export const getAdminInfoApi = ():PromiseType<AdinInfoData> => request.get(
    '/admin/info'
);

export const getAdminList = (data:AdminInfoListReq):PromiseType<AdminInfoListData> => request.get(
    '/admin/list',
    {params:data}
);

export const adminUpdateApi = (id:number,data?:AdminParam):PromiseType => request.post(
    '/admin/update/'+id,
    data
);