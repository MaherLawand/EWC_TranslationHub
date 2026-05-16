// import axios from "axios"

// export const api = axios.create({
//   baseURL: "${import.meta.env.VITE_API_URL}",

//   withCredentials: true,
// })

import axios from "axios"

export const api =
  axios.create({
    baseURL:
      import.meta.env.production
        .VITE_API_URL,

    withCredentials: true,
  })