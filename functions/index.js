const admin = require('firebase-admin')
const functions = require('firebase-functions')
const axios = require('axios')
const cheerio = require('cheerio')

admin.initializeApp()

require('dotenv').config()

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || ''

// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info('Hello logs!', { structuredData: true })
//   response.send('Hello from Firebase!')
// })

exports.covid19chathook = functions.https.onRequest(async (req, res) => {
  console.log(JSON.stringify(req.body))
  await admin
    .firestore()
    .collection('lineLog')
    .add({
      time: admin.firestore.Timestamp.now(),
      log: JSON.stringify(req.body),
    })
  // res.send('Hi')
  res.send('OK')
})

exports.covid19 = functions.pubsub
  .schedule('* * * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    // exports.covid19chathook = functions.https.onRequest(async (req, res) => {
    const response = await axios.get('https://covid19.ddc.moph.go.th/')
    const html = response.data

    const $ = cheerio.load(html)
    const selector = $('div.block-st-all h1')
    const selectorDate = $('.block-title-page.hidden-md.hidden-lg h2')

    if (selector.length !== 4 && selectorDate.length !== 1) {
      return null
    }

    let current = ''
    let currentDate = $(selectorDate).text().split(' : ')[1].trim() || ''
    // console.log(currentDate)

    if (currentDate === '') {
      return null
    }

    selector.each((index, element) => {
      if (index === 0) {
        current = $(element).text()
      } else {
        current = current.concat('|', $(element).text())
      }
    })
    // broadcast(current, currentDate)

    let previousStats = await admin.firestore().doc('line/covid19').get()
    if (
      !previousStats.exists ||
      previousStats.data().report !== current ||
      previousStats.data().updated !== currentDate
    ) {
      // await admin.firestore().doc('line/covid19').set({ report: current })
      await admin
        .firestore()
        .doc('line/covid19')
        .set({ report: current, updated: currentDate })
      // broadcast(current)
      broadcast(current, currentDate)
    }

    return res.send('OK')
  })

// const broadcast = (current) => {
//   const stats = current.split('|')
//   return axios({
//     method: 'post',
//     url: 'https://api.line.me/v2/bot/message/broadcast',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
//     },
//     data: JSON.stringify({
//       messages: [
//         {
//           type: 'flex',
//           altText: 'รายงานสถานการณ์ โควิด-19',
//           contents: {
//             type: 'bubble',
//             size: 'giga',
//             direction: 'ltr',
//             header: {
//               type: 'box',
//               layout: 'vertical',
//               backgroundColor: '#E1298EFF',
//               contents: [
//                 {
//                   type: 'text',
//                   text: 'ติดเชื้อสะสม',
//                   weight: 'bold',
//                   color: '#FFFFFFFF',
//                   align: 'center',
//                   size: 'xl',
//                 },
//                 {
//                   type: 'text',
//                   text: stats[0],
//                   weight: 'bold',
//                   size: '4xl',
//                   color: '#FFFFFFFF',
//                   align: 'center',
//                 },
//               ],
//             },
//             body: {
//               type: 'box',
//               layout: 'horizontal',
//               spacing: 'md',
//               contents: [
//                 {
//                   type: 'box',
//                   layout: 'vertical',
//                   flex: 1,
//                   paddingAll: '2%',
//                   backgroundColor: '#046034',
//                   cornerRadius: '8px',
//                   contents: [
//                     {
//                       type: 'text',
//                       text: 'หายแล้ว',
//                       color: '#FFFFFFFF',
//                       align: 'center',
//                       margin: 'sm',
//                       contents: [],
//                     },
//                     {
//                       type: 'text',
//                       text: stats[1],
//                       weight: 'bold',
//                       size: 'lg',
//                       color: '#FFFFFF',
//                       align: 'center',
//                       contents: [],
//                     },
//                   ],
//                 },
//                 {
//                   type: 'box',
//                   layout: 'vertical',
//                   flex: 1,
//                   paddingAll: '2%',
//                   backgroundColor: '#179c9b',
//                   cornerRadius: '8px',
//                   contents: [
//                     {
//                       type: 'text',
//                       text: 'รักษาอยู่ใน รพ.',
//                       color: '#FFFFFFFF',
//                       align: 'center',
//                       margin: 'sm',
//                     },
//                     {
//                       type: 'text',
//                       text: stats[2],
//                       weight: 'bold',
//                       size: 'lg',
//                       color: '#FFFFFF',
//                       align: 'center',
//                     },
//                   ],
//                 },
//                 {
//                   type: 'box',
//                   layout: 'vertical',
//                   flex: 1,
//                   paddingAll: '2%',
//                   backgroundColor: '#666666',
//                   cornerRadius: '8px',
//                   contents: [
//                     {
//                       type: 'text',
//                       text: 'เสียชีวิต',
//                       color: '#FFFFFFFF',
//                       align: 'center',
//                       margin: 'sm',
//                       contents: [],
//                     },
//                     {
//                       type: 'text',
//                       text: stats[3],
//                       weight: 'bold',
//                       size: 'lg',
//                       color: '#FFFFFF',
//                       align: 'center',
//                     },
//                   ],
//                 },
//               ],
//             },
//           },
//         },
//       ],
//     }),
//   })
// }

const broadcast = (current, date) => {
  const stats = current.split('|')
  return axios({
    method: 'post',
    url: 'https://api.line.me/v2/bot/message/broadcast',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
    data: JSON.stringify({
      messages: [
        {
          type: 'flex',
          altText: 'รายงานสถานการณ์ โควิด-19',
          contents: {
            type: 'bubble',
            size: 'giga',
            direction: 'ltr',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'รายงานสถานการณ์​โควิด-19',
                  color: '#FFFFFF',
                  weight: 'bold',
                  align: 'center',
                  size: 'xxl',
                },
                {
                  type: 'text',
                  text: `ข้อมูลวันที่ ${date}`,
                  size: 'md',
                  color: '#FFFFFF',
                  weight: 'regular',
                },
              ],
              alignItems: 'center',
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'box',
                          layout: 'vertical',
                          contents: [
                            {
                              type: 'text',
                              text: 'ติดเชื้อสะสม',
                              color: '#FFFFFF',
                              size: 'lg',
                            },
                            {
                              type: 'text',
                              text: stats[0],
                              color: '#FFFFFF',
                              size: '3xl',
                              weight: 'bold',
                            },
                          ],
                          backgroundColor: '#E1298EFF',
                          alignItems: 'center',
                          paddingAll: '3%',
                          cornerRadius: '10px',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: 'หายแล้ว',
                          color: '#FFFFFF',
                          size: 'sm',
                        },
                        {
                          type: 'text',
                          text: stats[1],
                          color: '#FFFFFF',
                          size: 'xl',
                          weight: 'bold',
                        },
                      ],
                      backgroundColor: '#046034',
                      alignItems: 'center',
                      paddingAll: '3%',
                      cornerRadius: '10px',
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: 'รักษาอยู่ใน รพ.',
                          color: '#FFFFFF',
                          size: 'sm',
                        },
                        {
                          type: 'text',
                          text: stats[2],
                          color: '#FFFFFF',
                          size: 'xl',
                          weight: 'bold',
                        },
                      ],
                      backgroundColor: '#179c9b',
                      alignItems: 'center',
                      paddingAll: '3%',
                      cornerRadius: '10px',
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: 'เสียชีวิต',
                          color: '#FFFFFF',
                          size: 'sm',
                        },
                        {
                          type: 'text',
                          text: stats[3],
                          color: '#FFFFFF',
                          size: 'xl',
                          weight: 'bold',
                        },
                      ],
                      backgroundColor: '#666666',
                      alignItems: 'center',
                      paddingAll: '3%',
                      cornerRadius: '10px',
                    },
                  ],
                  spacing: 'md',
                },
              ],
              spacing: 'md',
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'ข้อมูล: กรมควบคุมโรค',
                    uri: 'https://covid19.ddc.moph.go.th/',
                  },
                  color: '#006738',
                  height: 'sm',
                  style: 'primary',
                  margin: 'none',
                },
              ],
              paddingStart: '5%',
              paddingEnd: '5%',
            },
            styles: {
              header: {
                backgroundColor: '#006738',
              },
              body: {
                backgroundColor: '#FFFFFF',
              },
            },
          },
        },
      ],
    }),
  })
}
