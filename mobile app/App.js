import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, StatusBar, TouchableOpacity, ScrollView } from 'react-native'; 
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; 
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useKeepAwake } from 'expo-keep-awake';

// TODO: Update this URL for production (e.g., Render URL or local IP)
const SERVER_URL = 'http://localhost:3000/room-calendar'; 

export default function App() {
  useKeepAwake(); 

  const [meetings, setMeetings] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  let [fontsLoaded] = useFonts({
    Poppins_300Light, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold,
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data on mount and every 60 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
        console.log("Fetching data...", SERVER_URL);
        const response = await axios.get(SERVER_URL);
        
        const formattedMeetings = response.data.map(event => ({
            id: event.id,
            subject: event.subject,
            organizer: event.organizer.emailAddress.name,
            // Add 'Z' to ensure UTC parsing
            start: new Date(event.start.dateTime + 'Z'), 
            end: new Date(event.end.dateTime + 'Z'),
        }));

        formattedMeetings.sort((a, b) => a.start - b.start);
        setMeetings(formattedMeetings);
        findCurrentMeeting(formattedMeetings);
        setError(null);
    } catch (err) {
        console.error("Fetch Error:", err);
        setError('Could not connect to server. Please check network.');
    } finally {
        setLoading(false);
    }
  };

  const findCurrentMeeting = (allMeetings) => {
    const now = new Date();
    const activeMeeting = allMeetings.find(m => now >= m.start && now < m.end);
    setCurrentMeeting(activeMeeting);
  }

  // English Locale Formats
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
  
  const getNext30Days = () => {
      const days = [];
      for(let i=0; i<30; i++) {
          const d = new Date(); d.setDate(d.getDate() + i); days.push(d);
      }
      return days;
  };

  const filteredMeetings = meetings.filter(m => isSameDay(m.start, selectedDate));

  if (loading || !fontsLoaded) return ( <View style={styles.center}><ActivityIndicator size="large" color="#4facfe" /></View> );

  if (error) {
      return (
        <View style={styles.errorContainer}>
            <StatusBar barStyle="light-content" hidden={true} />
            <LinearGradient colors={['#3a0e0e', '#000']} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="cloud-offline-outline" size={80} color="#ff5252" />
            <Text style={styles.errorTitle}>No Connection</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
      );
  }

  const bgColors = currentMeeting ? ['#3a0e0e', '#1f0808'] : ['#063318', '#021208'];
  const accentColor = currentMeeting ? '#ff5252' : '#00e676';
  const nextDays = getNext30Days();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden={true} />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
      
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <View style={{width: 4, height: 40, backgroundColor: accentColor, marginRight: 15, borderRadius: 2}} />
            <View>
                <Text style={styles.headerRoom}>BTE TOPLANTI ODASI</Text>
                <Text style={styles.headerDate}>{formatDate(currentTime)}</Text>
            </View>
        </View>
        <Text style={styles.headerTime}>{formatTime(currentTime)}</Text>
      </View>

      <View style={styles.contentRow}>
          <BlurView intensity={30} tint="dark" style={styles.statusCard}>
             <View style={styles.statusTop}>
                 <Text style={[styles.statusLabel, {color: accentColor}]}>
                    {currentMeeting ? 'CURRENTLY BUSY' : 'AVAILABLE'}
                 </Text>
                 <Ionicons name={currentMeeting ? "lock-closed" : "checkmark-circle"} size={28} color={accentColor} />
             </View>

             <View style={styles.statusMain}>
                {currentMeeting ? (
                    <>
                        <Text style={styles.currentSubject} numberOfLines={3}>{currentMeeting.subject}</Text>
                        <View style={styles.organizerRow}>
                            <Ionicons name="person-circle-outline" size={24} color="#aaa" />
                            <Text style={styles.currentOrganizer}>{currentMeeting.organizer}</Text>
                        </View>
                        <View style={[styles.timeTag, {borderColor: accentColor}]}>
                            <Text style={styles.timeTagText}>Ends at: {formatTime(currentMeeting.end)}</Text>
                        </View>
                    </>
                ) : (
                    <>
                         <Text style={styles.freeText}>Room Available</Text>
                         <Text style={styles.freeSubText}>Open for reservations.</Text>
                    </>
                )}
             </View>
          </BlurView>

          <View style={styles.listContainer}>
              <View style={styles.dateStripContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {nextDays.map((date, index) => {
                          const isActive = isSameDay(date, selectedDate);
                          return (
                              <TouchableOpacity 
                                key={index} 
                                style={[styles.dateItem, isActive && {backgroundColor: accentColor, borderColor: accentColor}]}
                                onPress={() => setSelectedDate(date)}
                              >
                                  <Text style={[styles.dateDayName, isActive && {color: 'black'}]}>
                                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </Text>
                                  <Text style={[styles.dateNumber, isActive && {color: 'black'}]}>
                                      {date.getDate()}
                                  </Text>
                              </TouchableOpacity>
                          );
                      })}
                  </ScrollView>
              </View>

              <FlatList
                data={filteredMeetings}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    if (isSameDay(new Date(), selectedDate) && currentMeeting && currentMeeting.id === item.id) return null;
                    return (
                        <View style={styles.meetingItem}>
                            <Text style={styles.itemTime}>{formatTime(item.start)}</Text>
                            <View style={styles.itemLine} />
                            <View style={styles.itemContent}>
                                <Text style={styles.itemSubject} numberOfLines={1}>{item.subject}</Text>
                                <Text style={styles.itemOrganizer}>{item.organizer}</Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No events scheduled.</Text>}
              />
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingTop: 30, paddingBottom: 20 },
  headerRoom: { color: 'white', fontSize: 26, fontFamily: 'Poppins_700Bold' },
  headerDate: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Poppins_400Regular', textTransform: 'uppercase', letterSpacing: 1 },
  headerTime: { color: 'white', fontSize: 48, fontFamily: 'Poppins_300Light' },
  contentRow: { flex: 1, flexDirection: 'row', paddingHorizontal: 40, paddingBottom: 30 },
  statusCard: { flex: 1.2, marginRight: 30, borderRadius: 24, padding: 30, justifyContent: 'space-between', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 16, fontFamily: 'Poppins_700Bold', letterSpacing: 2 },
  statusMain: { flex: 1, justifyContent: 'center' },
  currentSubject: { color: 'white', fontSize: 32, fontFamily: 'Poppins_600SemiBold', lineHeight: 40, marginBottom: 15 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  currentOrganizer: { color: '#bbb', fontSize: 18, fontFamily: 'Poppins_400Regular', marginLeft: 10 },
  timeTag: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  timeTagText: { color: 'white', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  freeText: { color: 'white', fontSize: 36, fontFamily: 'Poppins_600SemiBold' },
  freeSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 20, fontFamily: 'Poppins_400Regular', marginTop: 10 },
  listContainer: { flex: 0.8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 24, padding: 25 },
  dateStripContainer: { marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  dateItem: { width: 60, height: 70, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  dateDayName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Poppins_400Regular', textTransform: 'uppercase' },
  dateNumber: { color: 'white', fontSize: 20, fontFamily: 'Poppins_700Bold' },
  meetingItem: { flexDirection: 'row', marginBottom: 20 },
  itemTime: { color: 'white', fontSize: 16, fontFamily: 'Poppins_600SemiBold', width: 50 },
  itemLine: { width: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
  itemContent: { flex: 1 },
  itemSubject: { color: 'white', fontSize: 16, fontFamily: 'Poppins_400Regular' },
  itemOrganizer: { color: '#666', fontSize: 13, fontFamily: 'Poppins_400Regular' },
  emptyText: { color: '#555', fontFamily: 'Poppins_400Regular', marginTop: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  errorTitle: { color: '#ff5252', fontSize: 28, fontFamily: 'Poppins_700Bold', marginVertical: 10 },
  errorText: { color: '#ddd', fontSize: 16, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 30 },
  retryButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  retryText: { color: 'white', fontFamily: 'Poppins_600SemiBold', fontSize: 16 }
});