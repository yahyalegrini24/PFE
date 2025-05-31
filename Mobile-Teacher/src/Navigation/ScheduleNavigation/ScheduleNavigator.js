import React from "react";
import {createStackNavigator} from "@react-navigation/stack";
import schedule from '../../screens/Class&Student/Class&Student'
import TimeTable from '../../screens/Class&Student/TimeTable'
import UploadLists from '../../screens/Class&Student/UploadListsPage'
import CourseDetails from '../../screens/Class&Student/CourseDetailsScreen'
import ExportPage from '../../screens/Class&Student/ExportPage'
import EditSession from '../../screens/Class&Student/EditSession'
import JustifiedStudents from '../../screens/Class&Student/JustifiedStudents'




const Stack = createStackNavigator();


const ScheduleNavigator = () =>{
    return (
        
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="scheduleSection">
                <Stack.Screen name="scheduleSection" component={schedule} />
                <Stack.Screen name="TimeTable" component={TimeTable} />
                <Stack.Screen name="UploadLists" component={UploadLists} />
                <Stack.Screen name="CourseDetails" component={CourseDetails} />
                <Stack.Screen name="ExportPage" component={ExportPage} />
                <Stack.Screen name="EditSession" component={EditSession} />
                <Stack.Screen name="JustifiedStudents" component={JustifiedStudents} />
          
            </Stack.Navigator>
        
    );

}
export default ScheduleNavigator;