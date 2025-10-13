import { redirect } from "next/navigation";

const Home = () => {
  redirect("/doctor/chat");
};

export default Home;
