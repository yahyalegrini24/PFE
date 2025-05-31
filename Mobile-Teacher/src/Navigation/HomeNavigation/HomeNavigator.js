import React from "react";
import {createStackNavigator} from "@react-navigation/stack";
import Home from '../../screens/Home/HomePageT'
import Attendancy from '../../screens/Home/Attendancy'


const Stack =createStackNavigator();


const HomeNavigator = () =>{
    return (
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="HomeSection">
                <Stack.Screen name="HomeSection" component={Home} />
                <Stack.Screen name="Attendancy" component={Attendancy} />
            </Stack.Navigator>
    );

}
export default HomeNavigator;