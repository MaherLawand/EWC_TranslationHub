// import axios from "axios"

// export const api = axios.create({
//   baseURL: "http://localhost:4000",

//   withCredentials: true,
// })

import axios from "axios"

export const api =
  axios.create({
    baseURL:
      import.meta.env
        .VITE_API_URL,

    withCredentials: true,
  })