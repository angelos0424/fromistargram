import {fetchApi} from "../../queryClient";


export const listAccount = () => fetchApi.get('/accounts')
