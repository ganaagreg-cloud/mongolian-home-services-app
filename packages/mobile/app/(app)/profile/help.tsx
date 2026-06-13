import { ScrollView, Text, View } from 'react-native'

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Хэрхэн захиалга өгөх вэ?',
    body: 'Нүүр хуудаснаас үйлчилгээгээ сонгоод хаяг, өдөр, цагаа оруулна. Шууд захиалбал төлбөрөө урьдчилан төлж ажилтан автоматаар олдоно. Саналаар бол ажилтнуудын саналаас сонгосны дараа төлбөрөө төлнө.',
  },
  {
    title: 'Төлбөр хэрхэн төлөгдөх вэ?',
    body: 'Бүх төлбөр QPay-ээр дамжин Escrow дансанд хадгалагдана. Ажил бүрэн дуусаагүй бол мөнгө ажилтанд шилжихгүй. Бэлэн мөнгөөр төлөхийг хориглоно.',
  },
  {
    title: 'Ажилтантай хэрхэн холбогдох вэ?',
    body: 'Аюулгүй байдлын үүднээс ажилтантай зөвхөн аппликейшн доторх чатаар холбогдоно. Утасны дугаар солилцохыг хориглоно.',
  },
  {
    title: 'Яаралтай үед яах вэ?',
    body: 'Идэвхтэй захиалгын дэлгэц дээрх улаан SOS товчийг дарвал 102 руу шууд залгаж, таны байршлыг манай тусламжийн багт илгээнэ.',
  },
  {
    title: 'Захиалга цуцлах',
    body: 'Ажилтан гарахаас өмнө үнэгүй цуцална. Эхлэхэд 1 цаг хүрэхгүй үлдсэн үед цуцалбал торгууль суутгагдана.',
  },
  {
    title: 'Холбоо барих',
    body: 'Санал хүсэлт, гомдлоо support@homeservices.mn хаягаар илгээнэ үү.',
  },
]

export default function Help() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 px-4 py-6">
      {SECTIONS.map((s) => (
        <View key={s.title} className="gap-1 rounded-xl border border-gray-200 p-4">
          <Text className="text-base font-semibold text-gray-900">{s.title}</Text>
          <Text className="text-sm leading-relaxed text-gray-600">{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
