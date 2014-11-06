package models;

import java.sql.*;
import play.db.*;

public class Teacher {

  public int id;
  public String email;
  public String fname;
  public String lname;

  private Teacher(int id, String email, String fname, String lname) {
    this.id = id;
    this.email = email;
    this.fname = fname;
    this.lname = lname;
  }

  public static Teacher authenticate(String email, String password) {
    try{
      Connection conn = DB.getConnection();
      PreparedStatement ps = conn.prepareStatement("SELECT * FROM `teachers` WHERE `user` = ? AND `pass` = SHA1(?)");
      ps.setString(1, email);
      ps.setString(2, password);
      ResultSet rs = ps.executeQuery();
      if(rs.next()) {
        int id = rs.getInt("id");
        String fname = rs.getString("fname");
        String lname = rs.getString("lname");
        return new Teacher(id, email, fname, lname);
      }
      return null;
    } catch (SQLException sqle) {
      return null;
    }
  }

}
