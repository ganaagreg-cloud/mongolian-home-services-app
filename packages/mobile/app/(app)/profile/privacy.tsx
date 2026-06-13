import { ScrollView, Text, View } from 'react-native'

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Цуглуулах мэдээлэл',
    body: 'Бид таны нэр, утасны дугаар, имэйл хаяг, захиалгын хаяг болон SOS дуудлагын үед байршлын мэдээллийг цуглуулна.',
  },
  {
    title: 'Мэдээллийн ашиглалт',
    body: 'Таны мэдээллийг зөвхөн үйлчилгээ үзүүлэх, төлбөр баталгаажуулах, аюулгүй байдлыг хангах зорилгоор ашиглана. Гуравдагч этгээдэд худалдахгүй.',
  },
  {
    title: 'Утасны дугаарын хамгаалалт',
    body: 'Таны утасны дугаар ажилтнуудад хэзээ ч харагдахгүй. Бүх харилцаа платформын чатаар дамжина.',
  },
  {
    title: 'Байршлын мэдээлэл',
    body: 'Байршлын мэдээллийг зөвхөн SOS дуудлагын үед, таны зөвшөөрөлтэйгөөр илгээнэ.',
  },
  {
    title: 'Мэдээлэл хадгалалт',
    body: 'Таны мэдээлэл шифрлэгдсэн серверт хадгалагдана. Бүртгэлээ устгуулах хүсэлтийг support@homeservices.mn хаягаар илгээж болно.',
  },
]

export default function Privacy() {
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
