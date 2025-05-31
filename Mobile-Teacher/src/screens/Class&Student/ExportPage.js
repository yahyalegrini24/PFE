import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  LayoutAnimation
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../configuration/supabase";
import Footer from "../../components/Footer";
import { UserContext } from "../../context/UserContext";
import { Picker } from '@react-native-picker/picker';

const ExportPage = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);

  // Organize sessions by year and semester
  const organizedSessions = sessions.reduce((acc, session) => {
    const year = session.yearName || 'Unknown Year';
    const semester = `Semester ${session.semester}`;
    
    if (!acc[year]) {
      acc[year] = {};
    }
    
    if (!acc[year][semester]) {
      acc[year][semester] = [];
    }
    
    acc[year][semester].push(session);
    return acc;
  }, {});

  // Filter sessions based on selected semester
  const filteredSessions = Object.entries(organizedSessions).reduce((acc, [year, semesters]) => {
    acc[year] = {};
    
    Object.entries(semesters).forEach(([semester, sessions]) => {
      if (selectedSemester === 'All' || semester === `Semester ${selectedSemester}`) {
        acc[year][semester] = sessions;
      }
    });
    
    return acc;
  }, {});

  const fetchTeacherSessions = useCallback(async () => {
    if (!user?.teacherId) return [];

    try {
      const { data, error } = await supabase
        .from('Session_structure')
        .select(`
          moduleId,
          groupId,
          Module:moduleId (
            moduleId,
            moduleName,
            SemesterId,
            SchoolYear:yearId (
              yearId,
              yearName
            )
          ),
          Group:groupId (
            groupId,
            groupName,
            group_path,
            Section:sectionId (
              sectionId,
              sectionName,
              SchoolYear:yearId (
                yearId,
                yearName,
                Degree:degreeId (
                  degreeId,
                  degreeName
                )
              )
            )
          )
        `)
        .eq('teacherId', user.teacherId);

      if (error) throw error;

      return data.map(session => ({
        sessionId: session.Session_structure_id,
        moduleId: session.moduleId,
        moduleName: session.Module?.moduleName || "Unknown Module",
        semester: session.Module?.SemesterId || "1",
        yearName: session.Module?.SchoolYear?.yearName || "Unknown Year",
        groupId: session.groupId,
        groupName: session.Group?.groupName || "Unknown Group",
        filePath: session.Group?.group_path,
        degreeName: session.Group?.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        sectionName: session.Group?.Section?.sectionName || "Unknown Section"
      }));
    } catch (error) {
      console.error("Error fetching teacher sessions:", error);
      return [];
    }
  }, [user?.teacherId]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sessions = await fetchTeacherSessions();
      setSessions(sessions);
    } catch (err) {
      console.error("Failed to load data:", err);
      Alert.alert("Error", "Failed to load session data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchTeacherSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleYear = (year) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const toggleSemester = (year, semester) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSemesters(prev => ({
      ...prev,
      [`${year}-${semester}`]: !prev[`${year}-${semester}`]
    }));
  };

  const handleDownload = (session) => {
    Alert.alert(
      "Download Materials",
      `Download materials for ${session.moduleName} - ${session.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => initiateDownload(session) }
      ]
    );
  };

  const initiateDownload = async (session) => {
    console.log("Download successful");
  };

  const SemesterFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowSemesterFilter(!showSemesterFilter)}
      >
        <Ionicons name="filter" size={18} color="#006633" />
        <Text style={styles.filterButtonText}>
          {selectedSemester === 'All' ? 'All Semesters' : `Semester ${selectedSemester}`}
        </Text>
        <Ionicons 
          name={showSemesterFilter ? 'chevron-up' : 'chevron-down'} 
          size={18} 
          color="#006633" 
        />
      </TouchableOpacity>
      
      {showSemesterFilter && (
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedSemester === 'All' && styles.selectedFilterOption
            ]}
            onPress={() => {
              setSelectedSemester('All');
              setShowSemesterFilter(false);
            }}
          >
            <Text style={selectedSemester === 'All' ? styles.selectedFilterText : styles.filterOptionText}>
              All Semesters
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedSemester === '1' && styles.selectedFilterOption
            ]}
            onPress={() => {
              setSelectedSemester('1');
              setShowSemesterFilter(false);
            }}
          >
            <Text style={selectedSemester === '1' ? styles.selectedFilterText : styles.filterOptionText}>
              Semester 1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedSemester === '2' && styles.selectedFilterOption
            ]}
            onPress={() => {
              setSelectedSemester('2');
              setShowSemesterFilter(false);
            }}
          >
            <Text style={selectedSemester === '2' ? styles.selectedFilterText : styles.filterOptionText}>
              Semester 2
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#006633"]}
            tintColor="#006633"
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Course Materials Export</Text>
          <Text style={styles.subHeader}>Download teaching materials for your sessions</Text>
        </View>
        
        <SemesterFilter />
        
        {loading ? (
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color="#006633" />
            <Text style={styles.loadingText}>Loading your sessions...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {Object.keys(filteredSessions).length > 0 ? (
              Object.entries(filteredSessions).map(([year, semesters]) => (
                <View key={year} style={styles.yearCard}>
                  <TouchableOpacity
                    onPress={() => toggleYear(year)}
                    style={styles.yearHeader}
                  >
                    <MaterialCommunityIcons name="school" size={20} color="#006633" />
                    <Text style={styles.yearText}>{year}</Text>
                    <Ionicons 
                      name={expandedYears[year] ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#006633" 
                    />
                  </TouchableOpacity>
                  
                  {expandedYears[year] && (
                    <View style={styles.semesterContainer}>
                      {Object.entries(semesters).map(([semester, semesterSessions]) => (
                        <View key={semester} style={styles.semesterCard}>
                          <TouchableOpacity
                            onPress={() => toggleSemester(year, semester)}
                            style={styles.semesterHeader}
                          >
                            <MaterialCommunityIcons name="calendar" size={18} color="#006633" />
                            <Text style={styles.semesterText}>{semester}</Text>
                            <Ionicons 
                              name={expandedSemesters[`${year}-${semester}`] ? 'chevron-down' : 'chevron-forward'} 
                              size={18} 
                              color="#006633" 
                            />
                          </TouchableOpacity>
                          
                          {expandedSemesters[`${year}-${semester}`] && (
                            <View style={styles.sessionsGrid}>
                              {semesterSessions.map((session) => (
                                <View key={`${session.moduleId}-${session.groupId}`} style={styles.sessionCard}>
                                  <View style={styles.sessionHeader}>
                                    <Text style={styles.moduleName}>{session.moduleName}</Text>
                                    <Text style={styles.groupName}>{session.groupName}</Text>
                                  </View>
                                  
                                  <View style={styles.sessionDetails}>
                                    <View style={styles.detailItem}>
                                      <MaterialCommunityIcons name="school" size={14} color="#006633" />
                                      <Text style={styles.detailText}>{session.degreeName}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                      <MaterialCommunityIcons name="google-classroom" size={14} color="#006633" />
                                      <Text style={styles.detailText}>{session.sectionName}</Text>
                                    </View>
                                  </View>
                                  
                                  <TouchableOpacity
                                    style={styles.downloadButton}
                                    onPress={() => handleDownload(session)}
                                  >
                                    <MaterialIcons name="cloud-download" size={18} color="#fff" />
                                    <Text style={styles.downloadText}>Download</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noSessionsContainer}>
                <MaterialCommunityIcons 
                  name="calendar-remove-outline" 
                  size={48} 
                  color="#006633" 
                />
                <Text style={styles.noSessionsText}>
                  {sessions.length > 0 
                    ? "No sessions for selected semester"
                    : "No teaching sessions assigned"}
                </Text>
                <Text style={styles.noSessionsSubText}>
                  {sessions.length > 0
                    ? "You don't have any modules assigned for this semester"
                    : "You don't have any modules assigned to teach yet"}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  scrollContent: {
    paddingBottom: 80,
    paddingHorizontal: 16
  },
  headerContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
    alignItems: 'center',           // Center horizontally
    justifyContent: 'center',       // Center vertically (for flex)
    marginTop: 40,                  // Push header a bit down
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#006633",
    marginBottom: 4,
    textAlign: 'center',            // Center text
  },
  subHeader: {
    fontSize: 14,
    color: "#64748b",
    textAlign: 'center',            // Center text
  },
  listContainer: {
    marginBottom: 20
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  loadingText: {
    marginTop: 16,
    color: '#006633',
    fontSize: 16
  },
  yearCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f7f0'
  },
  yearText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#006633',
    marginLeft: 10
  },
  semesterContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  semesterCard: {
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    overflow: 'hidden'
  },
  semesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 24
  },
  semesterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#006633',
    marginLeft: 10
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8
  },
  sessionCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sessionHeader: {
    marginBottom: 8
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#006633'
  },
  groupName: {
    fontSize: 14,
    color: '#64748b'
  },
  sessionDetails: {
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  detailText: {
    fontSize: 12,
    color: '#006633',
    marginLeft: 6
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006633',
    borderRadius: 4,
    padding: 8,
    marginTop: 8
  },
  downloadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6
  },
  noSessionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  noSessionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#006633',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8
  },
  noSessionsSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center'
  },
  filterContainer: {
    marginBottom: 20,
    zIndex: 10
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#006633',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  filterButtonText: {
    color: '#006633',
    fontWeight: '500',
    marginHorizontal: 10
  },
  filterOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  filterOption: {
    padding: 12
  },
  selectedFilterOption: {
    backgroundColor: '#f0f7f0'
  },
  filterOptionText: {
    color: '#1e293b'
  },
  selectedFilterText: {
    color: '#006633',
    fontWeight: '500'
  }
});

export default ExportPage;